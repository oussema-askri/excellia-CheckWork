import axios from './axios'

export const userApi = {
  getAll: async (params = {}) => {
    const response = await axios.get('/users', { params })
    return response
  },

  getById: async (id) => {
    const response = await axios.get(`/users/${id}`)
    return response
  },

  create: async (userData) => {
    const response = await axios.post('/users', userData)
    return response
  },

  update: async (id, userData) => {
    const response = await axios.put(`/users/${id}`, userData)
    return response
  },

  delete: async (id) => {
    const response = await axios.delete(`/users/${id}`)
    return response
  },

  toggleStatus: async (id) => {
    const response = await axios.put(`/users/${id}/status`)
    return response
  },

  getStats: async () => {
    const response = await axios.get('/users/stats')
    return response
  },

  getDepartments: async () => {
    const response = await axios.get('/users/departments')
    return response
  },

  // ✅ New function
  resetDevice: async (id) => {
    const response = await axios.put(`/users/${id}/reset-device`)
    return response
  }
}

export default userApi