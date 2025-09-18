/**
 * Authentication Context for Tiered Access Control
 * Manages user authentication state, tier information, and permissions
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { ethers } from 'ethers';
import cons from '../cons';

// Initial state
const initialState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  wallet: null,
  tier: null,
  investment: 0,
  permissions: [],
  adminPanelUrl: null,
  dbEndpoint: null,
  error: null,
  nonce: null,
  verificationMessage: null
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_WALLET: 'SET_WALLET',
  SET_NONCE: 'SET_NONCE',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  UPDATE_TIER: 'UPDATE_TIER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case AUTH_ACTIONS.SET_WALLET:
      return {
        ...state,
        wallet: action.payload,
        error: null
      };

    case AUTH_ACTIONS.SET_NONCE:
      return {
        ...state,
        nonce: action.payload.nonce,
        verificationMessage: action.payload.message,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        token: action.payload.token,
        wallet: action.payload.user.wallet,
        tier: action.payload.user.tier,
        investment: action.payload.user.investment,
        permissions: action.payload.user.permissions,
        adminPanelUrl: action.payload.user.adminPanelUrl,
        dbEndpoint: action.payload.user.dbEndpoint,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
        error: action.payload
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false
      };

    case AUTH_ACTIONS.UPDATE_TIER:
      return {
        ...state,
        tier: action.payload.tier,
        investment: action.payload.investment,
        permissions: action.payload.permissions,
        adminPanelUrl: action.payload.adminPanelUrl,
        dbEndpoint: action.payload.dbEndpoint,
        user: {
          ...state.user,
          ...action.payload
        }
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // API base URL
  const API_BASE = cons.API || 'http://localhost:8000';

  // Load saved authentication state on mount
  useEffect(() => {
    const loadSavedAuth = async () => {
      try {
        const savedToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('auth_user');

        if (savedToken && savedUser) {
          const user = JSON.parse(savedUser);
          
          // Verify token is still valid
          const response = await fetch(`${API_BASE}/api/v1/auth/session`, {
            headers: {
              'Authorization': `Bearer ${savedToken}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            dispatch({
              type: AUTH_ACTIONS.LOGIN_SUCCESS,
              payload: {
                token: savedToken,
                user: data.user
              }
            });
          } else {
            // Token is invalid, clear saved data
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
          }
        } else {
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        }
      } catch (error) {
        console.error('Error loading saved auth:', error);
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    loadSavedAuth();
  }, [API_BASE]);

  // Connect wallet
  const connectWallet = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      if (!window.ethereum) {
        throw new Error('MetaMask not detected');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const wallet = accounts[0];
      dispatch({ type: AUTH_ACTIONS.SET_WALLET, payload: wallet });

      return wallet;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.message
      });
      throw error;
    }
  };

  // Request nonce for wallet verification
  const requestNonce = async (wallet) => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/request-nonce`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wallet })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to request nonce');
      }

      dispatch({
        type: AUTH_ACTIONS.SET_NONCE,
        payload: {
          nonce: data.nonce,
          message: data.message
        }
      });

      return data;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.message
      });
      throw error;
    }
  };

  // Sign message with wallet
  const signMessage = async (message) => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not detected');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const signature = await signer.signMessage(message);

      return signature;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.message
      });
      throw error;
    }
  };

  // Verify wallet and authenticate
  const verifyWallet = async (wallet, signature, nonce) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      const response = await fetch(`${API_BASE}/api/v1/auth/verify-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wallet,
          signature,
          nonce
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Wallet verification failed');
      }

      // Save authentication data
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: data
      });

      return data;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: error.message
      });
      throw error;
    }
  };

  // Complete authentication flow
  const authenticate = async () => {
    try {
      // Step 1: Connect wallet
      const wallet = await connectWallet();

      // Step 2: Request nonce
      const nonceData = await requestNonce(wallet);

      // Step 3: Sign message
      const signature = await signMessage(nonceData.message);

      // Step 4: Verify wallet
      const authData = await verifyWallet(wallet, signature, nonceData.nonce);

      return authData;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  };

  // Refresh token
  const refreshToken = async () => {
    try {
      if (!state.token) {
        throw new Error('No token to refresh');
      }

      const response = await fetch(`${API_BASE}/api/v1/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: state.token })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Token refresh failed');
      }

      // Update saved authentication data
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: data
      });

      return data;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.message
      });
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      if (state.wallet) {
        await fetch(`${API_BASE}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ wallet: state.wallet })
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear saved data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  // Check if user has permission
  const hasPermission = (permission) => {
    if (!state.permissions) return false;
    return state.permissions.includes(permission) || state.permissions.includes('all_permissions');
  };

  // Check if user has tier access
  const hasTierAccess = (requiredTier) => {
    if (!state.tier) return false;
    
    const tierHierarchy = ['UNREGISTERED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
    const userTierIndex = tierHierarchy.indexOf(state.tier);
    const requiredTierIndex = tierHierarchy.indexOf(requiredTier);
    
    return userTierIndex >= requiredTierIndex;
  };

  // Verify investment and update tier
  const verifyInvestment = async () => {
    try {
      if (!state.wallet) return;

      const response = await fetch(`${API_BASE}/api/v1/auth/verify-investment/${state.wallet}`);
      const data = await response.json();

      if (data.success && data.data.verified) {
        const investmentData = data.data;
        
        // Check if tier needs to be updated
        if (investmentData.totalInvestment !== state.investment) {
          // Get updated tier info
          const tierResponse = await fetch(`${API_BASE}/api/v1/auth/tier-info/${state.wallet}`);
          const tierData = await tierResponse.json();

          if (tierData.success) {
            dispatch({
              type: AUTH_ACTIONS.UPDATE_TIER,
              payload: {
                tier: tierData.data.currentTier,
                investment: investmentData.totalInvestment,
                permissions: tierData.data.permissions,
                adminPanelUrl: tierData.data.adminPanelUrl,
                dbEndpoint: tierData.data.dbEndpoint
              }
            });

            // Update saved user data
            const updatedUser = {
              ...state.user,
              tier: tierData.data.currentTier,
              investment: investmentData.totalInvestment,
              permissions: tierData.data.permissions,
              adminPanelUrl: tierData.data.adminPanelUrl,
              dbEndpoint: tierData.data.dbEndpoint
            };
            localStorage.setItem('auth_user', JSON.stringify(updatedUser));
          }
        }
      }
    } catch (error) {
      console.error('Investment verification error:', error);
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Context value
  const value = {
    // State
    ...state,
    
    // Actions
    connectWallet,
    requestNonce,
    signMessage,
    verifyWallet,
    authenticate,
    refreshToken,
    logout,
    hasPermission,
    hasTierAccess,
    verifyInvestment,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;