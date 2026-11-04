import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await register(name, email, password);
      if (res.success) {
        toast.success('تم إنشاء الحساب بنجاح! 🚀');
        navigate('/');
      }
    } catch (err) {
      const errorObj = err.response?.data?.error;
      // إذا كان هناك تفاصيل من Validator لارافيل نعرض أول خطأ منها بوضوح
      if (errorObj?.details) {
        const firstError = Object.values(errorObj.details)[0][0];
        toast.error(firstError);
      } else {
        toast.error(errorObj?.message || 'فشل التسجيل، يرجى المحاولة لاحقاً');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4" dir="rtl">
      <Toaster />
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">حساب جديد</h2>
          <p className="text-slate-400 text-xs mt-1">أنشئ حساب زبون وابدأ التسوق فوراً</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل</label>
            <input
              type="text"
              required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-indigo-500/20 text-sm"
          >
            {loading ? 'جاري التسجيل...' : 'إنشاء الحساب'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          لديك حساب بالفعل؟ <Link to="/login" className="text-indigo-600 font-bold">تسجيل الدخول</Link>
        </p>
      </div>
    </div>
  );
}