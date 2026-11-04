import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { 
  PackageCheck, Clock, RefreshCw, CheckCircle, XCircle, 
  Truck, Box, User as UserIcon, ChevronRight, ChevronLeft 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const statusBadges = {
    pending: { label: 'قيد الانتظار', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    processing: { label: 'قيد المعالجة', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: RefreshCw },
    shipped: { label: 'تم الشحن', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Truck },
    completed: { label: 'مكتمل', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
    cancelled: { label: 'ملغي', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
  };

  const fetchOrders = async (currentPage = page) => {
    setLoading(true);
    try {
      const res = await API.get(`/api/v1/orders?page=${currentPage}`);
      if (res.data.success) {
        setOrders(res.data.data.data || res.data.data);
        setLastPage(res.data.data.last_page || 1);
      }
    } catch (err) {
      toast.error('فشل في جلب قائمة الطلبات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(page);
  }, [page]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await API.patch(`/api/v1/orders/${orderId}/status`, { status: newStatus });
      if (res.data.success) {
        const arabicLabel = statusBadges[newStatus]?.label || newStatus;
        toast.success(`تم تحديث حالة الطلب #${orderId} إلى "${arabicLabel}"`);
        fetchOrders(page);
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'تعذر تغيير حالة الطلب');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <Toaster />

      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              {user?.role === 'admin' ? 'إدارة الطلبات الشاملة (الأدمن)' : 'سجل طلباتي'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">تابع حالات جميع الطلبات والتأكيدات اللحظية.</p>
          </div>
          <button
            onClick={() => fetchOrders(page)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-36 bg-slate-200/60 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <Box className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-700 font-bold">لا يوجد طلبات حالياً</h3>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {orders.map((order) => {
                const badge = statusBadges[order.status] || statusBadges.pending;
                const StatusIcon = badge.icon;

                return (
                  <div
                    key={order.id}
                    className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                          <PackageCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-base">طلب #{order.id}</span>
                            {order.created_at && (
                              <span className="text-[11px] text-slate-400">
                                ({new Date(order.created_at).toLocaleDateString('ar-SY')})
                              </span>
                            )}
                          </div>
                          {/* عرض اسم الزبون وإيميله للأدمن فقط */}
                          {user?.role === 'admin' && order.user && (
                            <div className="flex items-center gap-1 text-xs text-indigo-600 font-semibold mt-0.5">
                              <UserIcon className="w-3.5 h-3.5" />
                              <span>الزبون: {order.user.name} ({order.user.email})</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" /> {badge.label}
                        </span>
                        <span className="text-slate-900 font-black text-lg">${Number(order.total_price).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* تفاصيل المنتجات */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-4 space-y-2">
                      {order.items?.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700">
                            • {item.product?.name || `منتج #${item.product_id}`}
                          </span>
                          <span className="text-slate-500 font-medium">
                            الكمية: {item.quantity} × ${Number(item.unit_price).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* لوحة التحكم بالحالة - للأدمن فقط */}
                    {user?.role === 'admin' && (
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <span className="text-xs font-semibold text-slate-500">تعديل الحالة (Admin):</span>
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                          <option value="pending">pending (قيد الانتظار)</option>
                          <option value="processing">processing (قيد المعالجة)</option>
                          <option value="shipped">shipped (تم الشحن)</option>
                          <option value="completed">completed (مكتمل)</option>
                          <option value="cancelled">cancelled (ملغي)</option>
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* أزرار التنقل بين صفحات الطلبات */}
            {lastPage > 1 && (
              <div className="mt-8 flex justify-center items-center gap-4">
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
      </div>
    </div>
  );
}