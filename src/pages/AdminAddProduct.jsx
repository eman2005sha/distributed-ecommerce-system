import React, { useState } from 'react';
import API from '../api/axios';
import { PlusCircle, Upload } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminAddProduct() {
  const [formData, setFormData] = useState({ name: '', description: '', price: '', category: '' });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('price', formData.price);
    data.append('category', formData.category);
    if (image) data.append('image', image);

    try {
      const res = await API.post('/api/v1/products', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success('تمت إضافة المنتج بنجاح! 🚀');
        setFormData({ name: '', description: '', price: '', category: '' });
        setImage(null);
        setPreview(null);
      }
    } catch (err) {
      const errorObj = err.response?.data?.error;
      // إذا كان هناك تفاصيل من Validator لارافيل نعرض أول خطأ منها بوضوح
      if (errorObj?.details) {
        const firstError = Object.values(errorObj.details)[0][0];
        toast.error(firstError);
      } else {
        toast.error(errorObj?.message || 'فشل في إضافة المنتج');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 font-sans" dir="rtl">
      <Toaster />
      <div className="max-w-2xl mx-auto bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
        <div className="mb-6 border-b border-slate-100 pb-4">
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <PlusCircle className="w-6 h-6 text-indigo-600" /> إضافة منتج جديد
          </h1>
          <p className="text-slate-500 text-xs mt-1">أدخل بيانات المنتج المحدثة لتكون متاحة فورياً للعملاء.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم المنتج</label>
            <input
              type="text"
              required
              placeholder="مثال: سماعات لاسلكية"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">السعر ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="99.99"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">التصنيف (Category)</label>
              <input
                type="text"
                required
                placeholder="electronics"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">وصف المنتج</label>
            <textarea
              rows={3}
              placeholder="تفاصيل المنتج ووصفه..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">صورة المنتج</label>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center bg-slate-50 relative hover:border-indigo-400 transition">
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {preview ? (
                <img src={preview} alt="معاينة" className="h-32 mx-auto rounded-xl object-cover" />
              ) : (
                <div className="text-slate-400 py-2">
                  <Upload className="w-8 h-8 mx-auto mb-1 stroke-1" />
                  <span className="text-xs block font-semibold">اضغط لرفع صورة (بحد أقصى 2MB)</span>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-indigo-500/20 text-sm"
          >
            {loading ? 'جاري الإضافة...' : 'حفظ ونشر المنتج'}
          </button>
        </form>
      </div>
    </div>
  );
}