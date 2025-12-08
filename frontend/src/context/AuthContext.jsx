import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // 1. Loading State prevents "flicker" on refresh
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('auth_token');

    if (storedUser && storedUser !== 'undefined' && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setAuthToken(storedToken);
        setIsAuthenticated(true);
      } catch (e) {
        console.error("Auth parsing error", e);
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
      }
    }
    // 2. Mark loading as done
    setLoading(false);
  }, []);


  const login = (userData, token) => {
    setUser(userData);
    setAuthToken(token);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('auth_token', token);
  };

  const logout = () => {
    setUser(null);
    setAuthToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    // Optional: window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      authToken, 
      isAuthenticated, 
      login, 
      logout,
      loading // Export this!
    }}>
      {children}
    </AuthContext.Provider>
  );
};