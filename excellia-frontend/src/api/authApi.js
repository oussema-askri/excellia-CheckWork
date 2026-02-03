import axios from './axios'

export const authApi = {
  login: async (credentials) => {
    const response = await axios.post('/auth/login', credentials)
    return response
  },

  register: async (userData) => {
    const response = await axios.post('/auth/register', userData)
    return response
  },

  getMe: async () => {
    const response = await axios.get('/auth/me')
    return response
  },

  updateProfile: async (data) => {
    const response = await axios.put('/auth/profile', data)
    return response
  },

  changePassword: async (data) => {
    const response = await axios.put('/auth/password', data)
    return response
  },

  logout: async () => {
    const response = await axios.post('/auth/logout')
    return response
  },
}

export default authApi