// src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:5000', // Your backend URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add auth_token from localStorage as Authorization header with auth_token scheme
api.interceptors.request.use(
  (config) => {
    const authToken = localStorage.getItem('auth_token'); 
    console.log('Retrieved auth_token from localStorage:', authToken); // Debug log
    if (authToken) {
      config.headers['Authorization'] = `auth_token ${authToken}`; // Attach as Authorization header with auth_token scheme
      console.log('Attached token to request:', authToken.substring(0, 20) + '...'); // Debug log
    } else {
      console.warn('No auth_token found in localStorage');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;