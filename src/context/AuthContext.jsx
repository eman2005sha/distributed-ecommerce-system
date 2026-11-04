import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // جلب بيانات المستخدم عند تحميل التطبيق (المسار الصحيح مع api/v1/)
  const fetchMe = async () => {
    try {
      const res = await API.get('/api/v1/auth/me');
      if (res.data.success) {
        setUser(res.data.data);
      }
    } catch (err) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/api/v1/auth/login', { email, password });
    if (res.data.success) {
      // تخزين التوكن في المفتاح الموحد 'token'
      const tokenValue = res.data.data?.token || res.data.data?.access_token;
      localStorage.setItem('token', tokenValue);
      setUser(res.data.data.user);
    }
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await API.post('/api/v1/auth/register', { name, email, password });
    if (res.data.success) {
      const tokenValue = res.data.data?.token || res.data.data?.access_token;
      localStorage.setItem('token', tokenValue);
      setUser(res.data.data.user);
    }
    return res.data;
  };

  const logout = async () => {
    try {
      await API.post('/api/v1/auth/logout');
    } catch (e) {}
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);