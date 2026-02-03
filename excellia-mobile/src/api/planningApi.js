import client from './client';

export const planningApi = {
  // For employee we will pull department schedule using /planning (allowed in your backend)
  getAll: (params) => client.get('/planning', { params }),
  getMy: (params) => client.get('/planning/my', { params }),
};