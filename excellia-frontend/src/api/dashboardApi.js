import axios from './axios'

export const dashboardApi = {
  getStats: async () => {
    const response = await axios.get('/dashboard/stats')
    return response
  },

  getTodaySummary: async () => {
    const response = await axios.get('/dashboard/today')
    return response
  },

  getWeeklySummary: async () => {
    const response = await axios.get('/dashboard/weekly')
    return response
  },

  getMonthlySummary: async (params = {}) => {
    const response = await axios.get('/dashboard/monthly', { params })
    return response
  },
}

export default dashboardApi