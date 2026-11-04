<?php

namespace App\Modules\Orders\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'user_id',
        'total_price',
        'status',
    ];

    // علاقة الطلب مع المستخدم (كل طلب يتبعه زبون واحد)
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // علاقة الطلب مع عناصر المنتجات بداخله
    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
}