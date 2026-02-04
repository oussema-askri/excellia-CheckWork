import client from './client';

export const attendanceApi = {
  getToday: () => client.get('/attendance/today'),
  getMy: (params) => client.get('/attendance/my', { params }),
  checkIn: (payload) => client.post('/attendance/check-in', payload || {}),
  checkOut: (payload) => client.post('/attendance/check-out', payload || {}),
  markAbsent: (payload) => client.post('/attendance/absent', payload || {}), // ✅ NEW
};