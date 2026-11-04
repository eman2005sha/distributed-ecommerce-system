import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingBag, Plus, Minus, Sparkles, Eye, X, 
  CheckCircle2, AlertTriangle, ServerCrash, ChevronRight, ChevronLeft 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // حفظ السلة في المتصفح لكي لا تضيع عند تحديث الصفحة أو تسجيل الدخول
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('shopping_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // حالات نافذة تفاصيل المنتج وفحص المخزون عبر gRPC
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('shopping_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    fetchProducts();
  }, [category, page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const url = `/api/v1/products?page=${page}${category ? `&category=${encodeURIComponent(category)}` : ''}`;
      const res = await API.get(url);
      if (res.data.success) {
        setProducts(res.data.data.data || []);
        setLastPage(res.data.data.last_page || 1);
      }
    } catch (err) {
      toast.error('فشل في تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  };

  // جلب تفاصيل المنتج والمخزون اللحظي من الباك-إند
  const handleViewProductDetails = async (productId) => {
    setDetailsLoading(true);
    setSelectedProduct({ id: productId, loading: true });
    try {
      const res = await API.get(`/api/v1/products/${productId}`);
      if (res.data.success) {
        setSelectedProduct(res.data.data);
      }
    } catch (err) {
      toast.error('تعذر جلب تفاصيل المنتج والمخزون');
      setSelectedProduct(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const addToCart = (product) => {
    if (user?.role === 'admin') {
      toast.error('حساب الأدمن مخصص للإدارة فقط ولا يمكنه الشراء');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: 1,
          image_path: product.image_path,
        },
      ];
    });
    toast.success(`تمت إضافة ${product.name} إلى السلة`, { position: 'bottom-right' });
  };

  const updateQuantity = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const handleCheckout = async () => {
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً لإتمام عملية الشراء');
      setIsCartOpen(false);
      setTimeout(() => navigate('/login'), 1200);
      return;
    }

    if (user.role === 'admin') {
      toast.error('حسابات المسؤولين مخصصة للإدارة ولا يمكنها إنشاء طلب شراء');
      return;
    }

    if (cart.length === 0) return;

    const loadingToast = toast.loading('جاري التحقق من المخزون عبر gRPC وإنشاء الطلب...');

    try {
      const itemsPayload = cart.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      }));

      const res = await API.post('/api/v1/orders', { items: itemsPayload });
      toast.dismiss(loadingToast);

      if (res.data.success) {
        toast.success('تم التأكد من المخزون عبر gRPC وإنشاء الطلب بنجاح! 🎉');
        setCart([]);
        localStorage.removeItem('shopping_cart');
        setIsCartOpen(false);
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      const errorData = err.response?.data?.error;
      
      if (errorData?.code === 'INSUFFICIENT_STOCK') {
        const remainingInfo = errorData.remaining_stock !== undefined 
          ? ` (المتبقي في المستودع: ${errorData.remaining_stock})` 
          : '';
        toast.error(`المخزون غير كافٍ: ${errorData.message}${remainingInfo}`);
      } else {
        toast.error(errorData?.message || 'حدث خطأ في إنشاء الطلب');
      }
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <Toaster />

      {/* Header Banner */}
      <div className="max-w-7xl mx-auto mb-10 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 mb-3 border border-indigo-100">
          <Sparkles className="w-3.5 h-3.5" /> منصة متطورة للتسوق
        </span>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">استكشف منتجاتنا المميزة</h1>
        <p className="text-slate-500 max-w-xl mx-auto text-sm">تسوق أحدث المنتجات مع فحص لحظي ومباشر للمخزون عبر gRPC.</p>
      </div>

      {/* Control Bar & Cart Trigger */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="تصفية حسب التصنيف (مثال: electronics)..."
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="w-full pl-4 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition"
          />
        </div>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition shadow-sm hover:shadow-indigo-500/20 w-full sm:w-auto justify-center"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>سلة الشراء</span>
          {cart.length > 0 && (
            <span className="bg-white text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 bg-slate-200/60 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="max-w-7xl mx-auto text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-1" />
          <h3 className="text-slate-700 font-bold text-base">لا توجد منتجات مطابقة</h3>
          <p className="text-slate-400 text-xs mt-1">جرّب البحث بتصنيف آخر أو امسح حقل التصفية.</p>
        </div>
      ) : (
        <>
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="group bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-full h-44 bg-slate-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center text-slate-400 relative">
                    {prod.image_path ? (
                      <img
                        src={`http://localhost:8000/storage/${prod.image_path}`}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <ShoppingBag className="w-10 h-10 stroke-1" />
                    )}
                    <button
                      onClick={() => handleViewProductDetails(prod.id)}
                      title="فحص المخزون اللحظي والتفاصيل"
                      className="absolute top-2.5 left-2.5 bg-white/90 hover:bg-white text-slate-700 hover:text-indigo-600 p-2 rounded-xl shadow-sm backdrop-blur-sm transition flex items-center gap-1 text-xs font-bold"
                    >
                      <Eye className="w-4 h-4" />
                      <span>فحص المخزون</span>
                    </button>
                  </div>

                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition">
                      {prod.name}
                    </h3>
                    <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                      {prod.category}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs line-clamp-2 mb-4 leading-relaxed">
                    {prod.description || 'لا يوجد وصف متاح للمنتج.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400 block">السعر</span>
                    <span className="text-xl font-black text-slate-900">${Number(prod.price).toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => addToCart(prod)}
                    className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors duration-200"
                  >
                    <Plus className="w-4 h-4" /> إضافة للسلة
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* أزرار التنقل بين الصفحات */}
          {lastPage > 1 && (
            <div className="max-w-7xl mx-auto mt-10 flex justify-center items-center gap-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                <ChevronRight className="w-4 h-4" /> السابق
              </button>
              <span className="text-xs font-bold text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-100">
                صفحة {page} من {lastPage}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page === lastPage}
                className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                التالي <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* نافذة تفاصيل المنتج */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-100 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-5 left-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {detailsLoading ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-xs font-bold text-slate-500">جاري الاتصال بخدمة المستودع (gRPC)...</p>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-1">{selectedProduct.name}</h3>
                <span className="inline-block text-xs font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full mb-4">
                  {selectedProduct.category}
                </span>

                <p className="text-slate-600 text-xs leading-relaxed mb-5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  {selectedProduct.description || 'لا يوجد وصف تفصيلي لهذا المنتج.'}
                </p>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 mb-6 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-600">حالة خدمة المستودع (gRPC):</span>
                    {selectedProduct.inventory_service_status === 'online' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> متصلة (Online)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                        <ServerCrash className="w-3.5 h-3.5" /> متوقفة (Offline)
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/60">
                    <span className="font-bold text-slate-600">الكمية المتوفرة حالياً:</span>
                    {selectedProduct.available_stock !== null && selectedProduct.available_stock !== undefined ? (
                      <span className={`font-black text-sm ${selectedProduct.available_stock > 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                        {selectedProduct.available_stock} قطعة
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> غير متاح حالياً
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">السعر</span>
                    <span className="text-2xl font-black text-slate-900">${Number(selectedProduct.price).toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => {
                      addToCart(selectedProduct);
                      setSelectedProduct(null);
                    }}
                    disabled={selectedProduct.available_stock === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold px-6 py-3 rounded-xl transition"
                  >
                    {selectedProduct.available_stock === 0 ? 'نفدت الكمية' : 'إضافة إلى السلة'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* سلة التسوق */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)}></div>
          <div className="fixed inset-y-0 left-0 max-w-full flex">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-600" /> سلة التسوق
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">إغلاق ✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <ShoppingBag className="w-12 h-12 mx-auto mb-3 stroke-1" />
                    <p className="text-sm">السلة فارغة حالياً</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product_id} className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <h4 className="font-semibold text-slate-800 text-sm mb-1">{item.name}</h4>
                        <span className="text-xs text-indigo-600 font-bold">${(Number(item.price) * item.quantity).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.product_id, -1)} className="w-7 h-7 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"><Minus className="w-3 h-3" /></button>
                        <span className="text-sm font-bold text-slate-700 w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product_id, 1)} className="w-7 h-7 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-4">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-600">المجموع الكلي:</span>
                    <span className="text-xl text-slate-900">${totalAmount.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-indigo-500/20 text-sm"
                  >
                    {user ? 'تأكيد الشراء (التحقق عبر gRPC)' : 'سجل دخولك لإتمام الشراء'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}