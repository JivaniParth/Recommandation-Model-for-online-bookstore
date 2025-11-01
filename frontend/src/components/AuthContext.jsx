import React, { createContext, useContext, useState, useEffect } from "react";
import apiService from "./apiService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const response = await apiService.verifyToken();
          if (response.success) {
            setUser(response.user);
          }
        } catch (error) {
          console.error("Token verification failed:", error);
          // Clear invalid token
          localStorage.removeItem("access_token");
          apiService.setToken(null);
        }
      }
      setIsInitializing(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await apiService.login(email, password);
      if (response.success) {
        setUser(response.user);
        return { success: true, user: response.user };
      }
      return { success: false, error: response.error };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message || "Login failed" };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (formData) => {
    setIsLoading(true);
    try {
      const response = await apiService.register(formData);
      if (response.success) {
        setUser(response.user);
        return { success: true, user: response.user };
      }
      return { success: false, error: response.error };
    } catch (error) {
      console.error("Signup error:", error);
      return { success: false, error: error.message || "Registration failed" };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    apiService.logout();
    // Force reload to reset all state and show customer view
    window.location.href = "/";
  };

  const updateProfile = async (updatedData) => {
    setIsLoading(true);
    try {
      const response = await apiService.updateProfile(updatedData);
      if (response.success) {
        setUser(response.user);
        return { success: true, user: response.user };
      }
      return { success: false, error: response.error };
    } catch (error) {
      console.error("Profile update error:", error);
      return {
        success: false,
        error: error.message || "Profile update failed",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    isInitializing,
    login,
    signup,
    logout,
    updateProfile,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Export the context itself for use in other files
export { AuthContext };
