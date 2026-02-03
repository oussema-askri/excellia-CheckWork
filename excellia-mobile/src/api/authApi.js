import client from './client';

export const authApi = {
  // ✅ Send deviceId along with email/password
  login: (email, password, deviceId) => 
    client.post('/auth/login', { email, password, deviceId }),
    
  me: () => client.get('/auth/me'),
};