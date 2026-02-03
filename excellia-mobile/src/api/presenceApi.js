import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

export const presenceApi = {
  downloadMy: async ({ year, month }) => {
    const token = await AsyncStorage.getItem('token');

    const res = await axios.get(`${API_BASE_URL}/presence/my`, {
      params: { year, month },
      responseType: 'arraybuffer',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    return res.data; // ArrayBuffer
  },
};