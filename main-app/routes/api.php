<?php

use App\Modules\Users\Controllers\AuthController;
use App\Modules\Products\Controllers\ProductController;
use App\Modules\Orders\Controllers\OrderController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes (Distributed E-Commerce Platform - Module 1)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // 1. مسارات المصادقة والمستخدمين (تحديد محاولات الدخول Throttle بـ 5 محاولات في الدقيقة لحماية النظام)
    Route::prefix('auth')->middleware('throttle:5,1')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
    });

    Route::middleware('auth:api')->prefix('auth')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    // 2. مسارات المنتجات
    Route::get('/products', [ProductController::class, 'index']); // متاح للجميع (عرض وتصفية)
    Route::get('/products/{id}', [ProductController::class, 'show']); // تفاصيل منتج
    
    Route::middleware(['auth:api', 'role:admin'])->group(function () {
        Route::post('/products', [ProductController::class, 'store']); // إضافة منتج (للأدمن فقط)
    });

    // 3. مسارات الطلبات
    Route::middleware('auth:api')->group(function () {
        Route::get('/orders', [OrderController::class, 'index']); // عرض الطلبات
        Route::get('/orders/{id}', [OrderController::class, 'show']); // عرض طلب محدد (إثبات منع وصول مستخدم لطلب غيره)
        Route::post('/orders', [OrderController::class, 'store']); // إنشاء طلب (للزبون)
        
       
        // تغيير حالة الطلب (متاح للـ Admin حصراً عبر Middleware الـ role)
        Route::patch('/orders/{id}/status', [OrderController::class, 'updateStatus'])->middleware('role:admin');
    });

});