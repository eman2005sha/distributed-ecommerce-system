import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="text-center mt-20">جاري التحميل...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <div className="text-center mt-20 text-red-600 font-bold">عذراً، هذه الصفحة مخصصة للمسؤولين (Admin) فقط.</div>;
  }

  return children;
}