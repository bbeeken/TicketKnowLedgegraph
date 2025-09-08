import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL } from '../config/env';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../auth/auth.store';

const instance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function processQueue(token: string | null) {
  refreshQueue.forEach(cb => cb(token));
  refreshQueue = [];
}

instance.interceptors.request.use(async (config: AxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (err) => {
    const originalReq = err.config;
    if (!originalReq) return Promise.reject(err);

    if (err.response && err.response.status === 401 && !originalReq._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((token: string | null) => {
            if (token) {
              originalReq.headers.Authorization = `Bearer ${token}`;
              resolve(instance(originalReq));
            } else {
              reject(err);
            }
          });
        });
      }

      originalReq._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');
        const response = await instance.post('/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefresh } = response.data;
        setTokens(accessToken, newRefresh);
        processQueue(accessToken);
        originalReq.headers.Authorization = `Bearer ${accessToken}`;
        return instance(originalReq);
      } catch (e) {
        processQueue(null);
        clearTokens();
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default instance;
