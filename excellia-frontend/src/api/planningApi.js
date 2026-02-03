import axios from './axios'

export const planningApi = {
  upload: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await axios.post('/planning/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response
  },

  getAll: async (params = {}) => {
    const response = await axios.get('/planning', { params })
    return response
  },

  getMy: async (params = {}) => {
    const response = await axios.get('/planning/my', { params })
    return response
  },

  getByUser: async (userId, params = {}) => {
    const response = await axios.get(`/planning/user/${userId}`, { params })
    return response
  },

  getById: async (id) => {
    const response = await axios.get(`/planning/${id}`)
    return response
  },

  update: async (id, data) => {
    const response = await axios.put(`/planning/${id}`, data)
    return response
  },

  delete: async (id) => {
    const response = await axios.delete(`/planning/${id}`)
    return response
  },

  deleteBatch: async (batchId) => {
    const response = await axios.delete(`/planning/batch/${batchId}`)
    return response
  },

  downloadTemplate: async () => {
    const response = await axios.get('/planning/template', {
      responseType: 'blob',
    })
    return response
  },
}

export default planningApi