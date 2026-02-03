import axios from './axios'

export const presenceApi = {
  downloadMy: async ({ year, month }) => {
    const blob = await axios.get('/presence/my', {
      params: { year, month },
      responseType: 'blob',
    })
    return blob
  },

  adminListRecords: async ({ year, month, page = 1, limit = 200 }) => {
    return axios.get('/presence/admin/records', {
      params: { year, month, page, limit },
    })
  },

  adminGenerateAndDownloadForUser: async ({ userId, year, month }) => {
    const blob = await axios.get(`/presence/admin/user/${userId}`, {
      params: { year, month },
      responseType: 'blob',
    })
    return blob
  },

  adminDownloadRecordById: async (id) => {
    const blob = await axios.get(`/presence/admin/records/${id}/download`, {
      responseType: 'blob',
    })
    return blob
  },

  // ✅ Generate ALL (store only, returns JSON)
  adminGenerateAll: async ({ year, month, department = '' }) => {
    return axios.post('/presence/admin/generate-all', { year, month, department })
  }
}

export default presenceApi