import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: false,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

// حقن التوكن تلقائياً في أي طلب مرسل إذا كان مخزناً
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default API;