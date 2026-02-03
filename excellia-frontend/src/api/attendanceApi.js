import axios from './axios'

export const attendanceApi = {
  checkIn: async (data = {}) => {
    const response = await axios.post('/attendance/check-in', data)
    return response
  },

  checkOut: async (data = {}) => {
    const response = await axios.post('/attendance/check-out', data)
    return response
  },

  getToday: async () => {
    const response = await axios.get('/attendance/today')
    return response
  },

  getMy: async (params = {}) => {
    const response = await axios.get('/attendance/my', { params })
    return response
  },

  getAll: async (params = {}) => {
    const response = await axios.get('/attendance', { params })
    return response
  },

  getByUser: async (userId, params = {}) => {
    const response = await axios.get(`/attendance/user/${userId}`, { params })
    return response
  },

  update: async (id, data) => {
    const response = await axios.put(`/attendance/${id}`, data)
    return response
  },

  delete: async (id) => {
    const response = await axios.delete(`/attendance/${id}`)
    return response
  },

  getStats: async (params = {}) => {
    const response = await axios.get('/attendance/stats', { params })
    return response
  },

  getReport: async (params = {}) => {
    const response = await axios.get('/attendance/report', { params })
    return response
  },
}

export default attendanceApi