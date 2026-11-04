<?php

namespace App\Modules\Orders\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Orders\Models\Order;
use App\Modules\Products\Models\Product;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    // 1. عرض الطلبات (الزبون يرى طلباته فقط، والمسؤول يرى كل الطلبات)
    public function index(Request $request)
    {
        $user = auth('api')->user();

        if ($user->role === 'admin') {
            $orders = Order::with('items.product', 'user')->paginate(10);
        } else {
            $orders = Order::where('user_id', $user->id)->with('items.product')->paginate(10);
        }

        return response()->json([
            'success' => true,
            'data' => $orders
        ]);
    }


    // 4. عرض تفاصيل طلب محدد (مع منع الزبون من الوصول لطلب غيره)
    public function show($id)
    {
        $user = auth('api')->user();
        $order = Order::with('items.product', 'user')->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'NOT_FOUND',
                    'message' => 'الطلب غير موجود.'
                ]
            ], 404);
        }

        // إثبات المتطلب الأول: منع المستخدم من الوصول إلى طلب غيره
        if ($user->role !== 'admin' && $order->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'FORBIDDEN_ACCESS',
                    'message' => 'غير مصرح لك بالوصول إلى طلبات مستخدم آخر.'
                ]
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $order
        ]);
    }
    // 2. إنشاء طلب جديد (متاح للزبون حصراً مع حجز المخزون عبر gRPC ومعالجة حالات الفشل)
    public function store(Request $request)
    {
        $user = auth('api')->user();

        // منع المسؤول من إنشاء طلبات شراء
        if ($user->role === 'admin') {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'FORBIDDEN',
                    'message' => 'حسابات المسؤوليين مخصصة للإدارة فقط ,ولا يمكنها إنشاء طلبات شراء.'
                ]
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'بيانات الطلب غير صالحة.',
                    'details' => $validator->errors()
                ]
            ], 422);
        }

        // تجهيز قائمة المنتجات لإرسالها في طلب واحد إلى خدمة المستودع
        $grpcItems = [];
        $totalPrice = 0;
        $orderItemsData = [];

        foreach ($request->items as $itemData) {
            $product = Product::find($itemData['product_id']);
            $quantity = (int) $itemData['quantity'];

            $grpcItems[] = [
                'product_id' => (int) $product->id,
                'quantity' => $quantity,
            ];

            $totalPrice += ($product->price * $quantity);
            $orderItemsData[] = [
                'product_id' => $product->id,
                'quantity' => $quantity,
                'unit_price' => $product->price,
            ];
        }

        // الخطوة أ: إرسال طلب واحد لخدمة المستودع للتحقق من كل المنتجات وحجزها (مع مهلة 3 ثوانٍ)
        try {
            $grpcResponse = Http::timeout(3)->post('http://inventory-service:50052/reserve', [
                'items' => $grpcItems
            ]);
        } catch (ConnectionException $e) {
            // الحالة 2 من الفشل: خدمة المستودع متوقفة أو لا ترد خلال المهلة المحددة
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'INVENTORY_SERVICE_UNAVAILABLE',
                    'message' => 'خدمة المستودع متوقفة حالياً أو لا تستجيب ضمن المهلة المحددة، يرجى المحاولة لاحقاً.'
                ]
            ], 503);
        }

        // الحالة 1 من الفشل: الكمية غير كافية في المستودع
        if (!$grpcResponse->successful() || !$grpcResponse->json('success')) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'INSUFFICIENT_STOCK',
                    'message' => $grpcResponse->json('message') ?? 'الكمية المطلوبة غير كافية في المستودع.',
                    'failed_product_id' => $grpcResponse->json('failed_product_id'),
                    'remaining_stock' => $grpcResponse->json('remaining_stock')
                ]
            ], 400);
        }

        // الخطوة ب: حفظ الطلب في قاعدة بيانات لارافيل بعد نجاح الحجز
        DB::beginTransaction();
        try {
            $order = Order::create([
                'user_id' => $user->id,
                'total_price' => $totalPrice,
                'status' => 'pending',
            ]);

            foreach ($orderItemsData as $item) {
                $order->items()->create($item);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'تم حجز الكميات عبر gRPC وإنشاء الطلب بنجاح.',
                'data' => $order->load('items.product')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            // الحالة 3 من الفشل: تم الحجز في المستودع ثم فشل حفظ الطلب -> إرجاع الكمية المحجوزة فوراً!
            try {
                Http::timeout(3)->post('http://inventory-service:50052/release', [
                    'items' => $grpcItems
                ]);
            } catch (\Exception $releaseEx) {
                // تجاهل خطأ الإرجاع في حال انقطاع الاتصال المفاجئ
            }

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'ORDER_SAVE_FAILED_STOCK_RELEASED',
                    'message' => 'فشل حفظ الطلب في قاعدة البيانات، وتم إرجاع الكمية المحجوزة إلى المستودع تلقائياً.',
                    'details' => $e->getMessage()
                ]
            ], 500);
        }
    }

    // 3. تغيير حالة الطلب (متاح للـ Admin حصراً)
    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,processing,shipped,completed,cancelled',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'حالة الطلب غير صالحة.',
                    'details' => $validator->errors()
                ]
            ], 422);
        }

        $order = Order::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'NOT_FOUND',
                    'message' => 'الطلب غير موجود.'
                ]
            ], 404);
        }

        $order->update([
            'status' => $request->status
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم تحديث حالة الطلب بنجاح',
            'data' => $order
        ]);
    }
}