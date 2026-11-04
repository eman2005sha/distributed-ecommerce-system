<?php

namespace App\Modules\Products\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Products\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;

class ProductController extends Controller
{
    // 1. عرض كل المنتجات مع التصفية وتقسيم الصفحات (Pagination & Filtering)
    public function index(Request $request)
    {
        $query = Product::query();

        // التصفية حسب التصنيف إذا وُجد في الرابط (مثل ?category=electronics)
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        // التقسيم إلى صفحات (Pagination) - كل صفحة 10 منتجات افتراضياً
        $products = $query->paginate(10);

        return response()->json([
            'success' => true,
            'data' => $products
        ]);
    }

    // 2. إضافة منتج جديد (متاح فقط للـ Admin)
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'category' => 'required|string|max:100',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'بيانات المنتج غير صالحة.',
                    'details' => $validator->errors()
                ]
            ], 422);
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('products', 'public');
        }

        $product = Product::create([
            'name' => $request->name,
            'description' => $request->description,
            'price' => $request->price,
            'category' => $request->category,
            'image_path' => $imagePath,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إضافة المنتج بنجاح',
            'data' => $product
        ], 201);
    }

    // 3. عرض تفاصيل منتج واحد مع جلب الكمية المتوفرة من خدمة المستودع (gRPC)
    public function show($id)
    {
        $product = Product::find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'NOT_FOUND',
                    'message' => 'المنتج غير موجود.'
                ]
            ], 404);
        }

        // سؤال خدمة المستودع عن الكمية المتوفرة عبر gRPC
        $availableStock = null;
        $inventoryStatus = 'online';

        try {
            $grpcResponse = Http::timeout(2)->get("http://inventory-service:50052/stock/{$product->id}");
            if ($grpcResponse->successful()) {
                $availableStock = $grpcResponse->json('available_stock');
            } else {
                $inventoryStatus = 'error';
            }
        } catch (\Exception $e) {
            // في حال كانت خدمة المستودع متوقفة لا يتعطل عرض المنتج بل يوضح حالة المستودع
            $inventoryStatus = 'offline (inventory service unavailable)';
        }

        $productData = $product->toArray();
        $productData['available_stock'] = $availableStock;
        $productData['inventory_service_status'] = $inventoryStatus;

        return response()->json([
            'success' => true,
            'data' => $productData
        ]);
    }
}