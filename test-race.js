// ملف اختبار التزاحم (Race Condition Proof)
// يرسل 5 طلبات متزامنة في نفس اللحظة على المنتج رقم 5 (الذي يملك قطعة واحدة فقط في المستودع)

const TOKEN = process.argv[2]; // نمرر توكن الزبون عند التشغيل

if (!TOKEN) {
    console.log("يرجى تمرير توكن الزبون: node test-race.js <CUSTOMER_TOKEN>");
    process.exit(1);
}

async function sendConcurrentOrders() {
    console.log("🚀 إرسال 5 طلبات متزامنة في نفس اللحظة على آخر قطعة من المنتج رقم 5...\n");

    const requests = Array.from({ length: 5 }, (_, index) =>
        fetch('http://127.0.0.1:8000/api/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({
                items: [{ product_id: 5, quantity: 1 }]
            })
        }).then(async res => ({
            attempt: index + 1,
            status: res.status,
            body: await res.json()
        }))
    );

    const results = await Promise.all(requests);

    results.forEach(r => {
        console.log(`الطلب رقم #${r.attempt} -> الحالة: ${r.status} | النتيجة: ${r.body.message || r.body.error?.message}`);
    });
}

sendConcurrentOrders();