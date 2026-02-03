
import { useState, useCallback } from 'react';
import axios, { AxiosRequestConfig } from 'axios';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store.ts';
import * as mockData from '../data/mockData.ts';
import { API_BASE } from '../config';

export const useFetch = <T>() => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isMockMode, token } = useSelector((state: RootState) => state.auth);

  const request = useCallback(async (endpoint: string, options: AxiosRequestConfig = {}) => {
    setLoading(true);
    setError(null);

    if (isMockMode) {
      return new Promise<T>((resolve) => {
        setTimeout(() => {
          let mockResponse: any = null;
          
          if (endpoint.includes('/tours/')) {
            const id = endpoint.split('/').pop();
            mockResponse = mockData.mockTours.find(t => t.id === id) || null;
          } else if (endpoint.startsWith('/tours') || endpoint.startsWith('/get-tours')) {
            mockResponse = mockData.mockTours || [];
          } else if (endpoint.startsWith('/issues')) {
            mockResponse = mockData.mockIssues || [];
          } else if (endpoint.startsWith('/expenses')) {
            mockResponse = mockData.mockExpenses || [];
          } else if (endpoint.startsWith('/floats')) {
            mockResponse = mockData.mockFloats || [];
          } else if (endpoint.startsWith('/inspections')) {
            mockResponse = mockData.mockInspections || [];
          } else if (endpoint === '/get-vehicles') {
            mockResponse = { status: 1, data: mockData.mockVehicles || [] };
          } else if (endpoint === '/get-drivers') {
            mockResponse = { status: 1, data: mockData.mockDrivers || [] };
          } else if (endpoint === '/add-vehicle') {
            mockResponse = { status: 1, data: { id: `v-${Math.random().toString(36).substr(2, 9)}` } };
          } else if (endpoint.startsWith('/vehicles/')) {
            mockResponse = { status: 1, message: "Deleted" };
          } else if (endpoint === '/authenticate') {
            const body = options.data || {};
            const username = body.username || '';
            const foundUser = mockData.mockUsers.find(u => u.username === username) || mockData.mockUsers[0];
            mockResponse = { status: 1, message: "User authenticated", data: foundUser };
          }

          if (mockResponse === null && !endpoint.includes('/authenticate')) {
             if (endpoint.endsWith('s')) mockResponse = { status: 1, data: [] };
          }

          const finalData = (endpoint === '/authenticate' || endpoint === '/add-vehicle' || endpoint === '/get-vehicles' || endpoint === '/get-drivers') 
            ? mockResponse.data 
            : (mockResponse?.data || mockResponse);
          
          setData(finalData);
          setLoading(false);
          resolve(finalData as T);
        }, 600);
      });
    }

    try {
      const config: AxiosRequestConfig = {
        ...options,
        url: `${API_BASE}${endpoint}`,
        headers: {
          ...options.headers,
          Authorization: token ? `Bearer ${token}` : '',
        },
      };
      const response = await axios(config);
      
      // Backend consistently wraps data in 'data' when status is 1
      const result = response.data.status === 1 ? response.data.data : response.data;
      
      setData(result);
      setLoading(false);
      return result as T;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'System error: Communication failed.';
      setError(msg);
      setLoading(false);
      
      if (err.code === 'ERR_NETWORK' && !isMockMode) {
        setError('Network Connection Failed: Backend server is unreachable. Check your API_BASE in config.ts.');
      }
      
      throw new Error(msg);
    }
  }, [isMockMode, token]);

  return { data, loading, error, request, setData };
};
