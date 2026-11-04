import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import ProductsPage from './pages/ProductsPage';
import Login from './pages/Login';
import Register from './pages/Register';
import OrdersPage from './pages/OrdersPage';
import AdminAddProduct from './pages/AdminAddProduct';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<ProductsPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/admin/add-product"
              element={
                <ProtectedRoute adminOnly={true}>
                  <AdminAddProduct />
                </ProtectedRoute>
              }
            />

            {/* توجيه أي رابط خاطئ إلى الصفحة الرئيسية */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}