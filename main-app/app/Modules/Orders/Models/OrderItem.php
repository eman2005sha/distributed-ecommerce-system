<?php

namespace App\Modules\Orders\Models;

use App\Modules\Products\Models\Product;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'product_id',
        'quantity',
        'unit_price',
    ];

    // علاقة العنصر مع المنتج الأساسي
    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}