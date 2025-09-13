import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/env';
import { getAccessToken, ensureValidToken } from '../auth/auth.store';

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

instance.interceptors.request.use(async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
  const token = await ensureValidToken();
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

    if (err.response && err.response.status === 401 && !(originalReq as any)._retry) {
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
      (originalReq as any)._retry = true;
      isRefreshing = true;
      try {
        const newAccess = await ensureValidToken();
        processQueue(newAccess);
        if (newAccess) {
          originalReq.headers.Authorization = `Bearer ${newAccess}`;
          return instance(originalReq);
        }
        return Promise.reject(err);
      } catch (e) {
        processQueue(null);
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default instance;
