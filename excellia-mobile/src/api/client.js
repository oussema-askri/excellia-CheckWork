import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => {
    // If it's a binary download we want the raw response data (arraybuffer)
    // axios in RN can behave differently; this keeps it safe.
    return res.data;
  },
  async (error) => {
    const message = error?.response?.data?.message || error.message || 'Request failed';
    return Promise.reject({ ...error, message, data: error?.response?.data });
  }
);

export default client;