const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PROTO_PATH = path.join(__dirname, 'proto/inventory.proto');
const DB_FILE = path.join(__dirname, 'inventory_db.json');

// 1. قاعدة بيانات مستقلة خاصة بخدمة المستودع
function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialStock = { "1": 50, "2": 21, "3": 20, "4": 15, "5": 1 }; // المنتج 5 فيه قطعة واحدة فقط لاختبار الـ Race Condition!
        fs.writeFileSync(DB_FILE, JSON.stringify(initialStock, null, 2));
        return initialStock;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

let stockDB = loadDB();

// 2. قفل تزامن (Mutex Queue) لمنع الـ Race Condition بشكل قاطع
let lockPromise = Promise.resolve();
function withLock(fn) {
    const next = lockPromise.then(() => fn());
    lockPromise = next.catch(() => {});
    return next;
}

// إعداد بروتوكول gRPC
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const inventoryProto = grpc.loadPackageDefinition(packageDefinition).inventory;

// 3. تنفيذ العمليات الثلاث في العقد (Proto)
const gRpcHandlers = {
    // أ. معرفة الكمية المتوفرة
    GetStock: (call, callback) => {
        const productId = String(call.request.product_id);
        const available = stockDB[productId] ?? 0;
        callback(null, { product_id: call.request.product_id, available_stock: available });
    },

    // ب. التحقق من كميات كل منتجات الطلب وحجزها دفعة واحدة (Atomic Reservation)
    ReserveStock: (call, callback) => {
        withLock(async () => {
            const items = call.request.items || [];

            // فحص جميع المنتجات أولاً قبل خصم أي قطعة
            for (const item of items) {
                const pid = String(item.product_id);
                const currentStock = stockDB[pid] ?? 0;
                if (currentStock < item.quantity) {
                    return callback(null, {
                        success: false,
                        message: `الكمية غير كافية للمنتج رقم ${pid}`,
                        failed_product_id: item.product_id,
                        remaining_stock: currentStock
                    });
                }
            }

            // إذا كانت كل المنتجات متوفرة، نقوم بحجزها وحفظ التعديل
            for (const item of items) {
                const pid = String(item.product_id);
                stockDB[pid] -= item.quantity;
            }
            saveDB(stockDB);

            callback(null, {
                success: true,
                message: 'تم حجز كافة كميات الطلب بنجاح عبر gRPC',
                failed_product_id: 0,
                remaining_stock: 0
            });
        });
    },

    // ج. إرجاع الكمية المحجوزة في حال فشل حفظ الطلب في لارافيل
    ReleaseStock: (call, callback) => {
        withLock(async () => {
            const items = call.request.items || [];
            for (const item of items) {
                const pid = String(item.product_id);
                stockDB[pid] = (stockDB[pid] ?? 0) + item.quantity;
            }
            saveDB(stockDB);

            callback(null, {
                success: true,
                message: 'تم إرجاع الكميات المحجوزة إلى المستودع بنجاح',
                failed_product_id: 0,
                remaining_stock: 0
            });
        });
    }
};

// تشغيل خادم gRPC على المنفذ 50051
const server = new grpc.Server();
server.addService(inventoryProto.InventoryService.service, gRpcHandlers);
server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    console.log('gRPC Inventory Server running on port 50051');
});

// عميل gRPC داخلي مع جسر للتواصل مع لارافيل
const grpcClient = new inventoryProto.InventoryService('127.0.0.1:50051', grpc.credentials.createInsecure());

const bridgeServer = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET' && req.url.startsWith('/stock/')) {
        const productId = parseInt(req.url.split('/')[2], 10);
        grpcClient.GetStock({ product_id: productId }, (err, response) => {
            if (err) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: err.message }));
            }
            res.statusCode = 200;
            res.end(JSON.stringify(response));
        });
        return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        const data = body ? JSON.parse(body) : {};

        if (req.method === 'POST' && req.url === '/reserve') {
            grpcClient.ReserveStock({ items: data.items }, (err, response) => {
                if (err) {
                    res.statusCode = 500;
                    return res.end(JSON.stringify({ success: false, message: err.message }));
                }
                res.statusCode = response.success ? 200 : 400;
                res.end(JSON.stringify(response));
            });
        } else if (req.method === 'POST' && req.url === '/release') {
            grpcClient.ReleaseStock({ items: data.items }, (err, response) => {
                if (err) {
                    res.statusCode = 500;
                    return res.end(JSON.stringify({ success: false, message: err.message }));
                }
                res.statusCode = 200;
                res.end(JSON.stringify(response));
            });
        } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ message: 'Not Found' }));
        }
    });
});

bridgeServer.listen(50052, '0.0.0.0', () => {
    console.log('gRPC Bridge listening on port 50052');
});