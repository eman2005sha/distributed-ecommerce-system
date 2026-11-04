import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Store, ShoppingBag, PlusCircle, LogOut, LogIn, UserPlus, ShieldAlert, User } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* الشعار والروابط الرئيسية */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 font-black text-xl text-indigo-600 tracking-tight">
              <Store className="w-6 h-6 stroke-[2.5]" />
              <span>متجري</span>
            </Link>

            <div className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600">
              <Link to="/" className="flex items-center gap-1.5 hover:text-indigo-600 transition">
                <Store className="w-4 h-4" /> المنتجات
              </Link>
              {user && (
                <Link to="/orders" className="flex items-center gap-1.5 hover:text-indigo-600 transition">
                  <ShoppingBag className="w-4 h-4" /> الطلبات
                </Link>
              )}
              {user?.role === 'admin' && (
                <Link
                  to="/admin/add-product"
                  className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100 font-semibold hover:bg-indigo-100 transition"
                >
                  <PlusCircle className="w-4 h-4" /> إضافة منتج (أدمن)
                </Link>
              )}
            </div>
          </div>

          {/* حالة المستخدم وتسجيل الدخول */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 pl-2 pr-3 py-1 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0)}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-800 leading-none mb-0.5">{user.name}</div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full inline-block ${
                      user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {user.role === 'admin' ? 'مسؤول' : 'زبون'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title="تسجيل الخروج"
                  className="text-slate-400 hover:text-red-500 p-1 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 text-xs font-bold px-3 py-2 rounded-xl transition"
                >
                  <LogIn className="w-4 h-4" /> دخول
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm shadow-indigo-500/20"
                >
                  <UserPlus className="w-4 h-4" /> حساب جديد
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}