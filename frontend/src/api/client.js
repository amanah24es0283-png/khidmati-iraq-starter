import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('khidmati_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default api
