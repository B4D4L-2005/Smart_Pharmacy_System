const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to get auth headers
function getHeaders() {
  const token = localStorage.getItem('pharmacy_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Unified request handler
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, config);
    
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text || `HTTP Error ${response.status}: ${response.statusText}` };
    }
    
    if (!response.ok) {
      const errMsg = data.message || `Request failed with status ${response.status}`;
      const detailMsg = data.error ? ` (${data.error})` : '';
      throw new Error(`${errMsg}${detailMsg}`);
    }
    
    return data;
  } catch (error) {
    console.error(`[API Request Error] ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Auth
  auth: {
    async login(email, password) {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (data.token) {
        localStorage.setItem('pharmacy_token', data.token);
      }
      return data;
    },

    async signup(signUpData) {
      const data = await request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(signUpData)
      });
      if (data.token) {
        localStorage.setItem('pharmacy_token', data.token);
      }
      return data;
    },

    async sendOTP(email, isSignup) {
      return await request('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email, isSignup })
      });
    },

    async verifyOTPLogin(email, otpCode) {
      const data = await request('/auth/verify-otp-login', {
        method: 'POST',
        body: JSON.stringify({ email, otpCode })
      });
      if (data.token) {
        localStorage.setItem('pharmacy_token', data.token);
      }
      return data;
    },

    async verifyOTPRegister(signUpData) {
      const data = await request('/auth/verify-otp-register', {
        method: 'POST',
        body: JSON.stringify(signUpData)
      });
      if (data.token) {
        localStorage.setItem('pharmacy_token', data.token);
      }
      return data;
    },

    async getProfile() {
      return await request('/auth/profile');
    },

    async updateProfile(profileData) {
      return await request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });
    },

    logout() {
      localStorage.removeItem('pharmacy_token');
    },

    async restoreUser(data) {
      return await request('/auth/restore', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },

    isAuthenticated() {
      return !!localStorage.getItem('pharmacy_token');
    }
  },

  // Medicines
  medicines: {
    async list(filters = {}) {
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.order) queryParams.append('order', filters.order);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      return await request(`/medicines${queryString}`);
    },

    async get(id) {
      return await request(`/medicines/${id}`);
    },

    async create(medData) {
      return await request('/medicines', {
        method: 'POST',
        body: JSON.stringify(medData)
      });
    },

    async update(id, medData) {
      return await request(`/medicines/${id}`, {
        method: 'PUT',
        body: JSON.stringify(medData)
      });
    },

    async delete(id) {
      return await request(`/medicines/${id}`, {
        method: 'DELETE'
      });
    },

    async triggerScan() {
      return await request('/medicines/scan', {
        method: 'POST'
      });
    }
  },

  // Billing
  billing: {
    async create(billData) {
      return await request('/billing', {
        method: 'POST',
        body: JSON.stringify(billData)
      });
    },

    async list(filters = {}) {
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      return await request(`/billing${queryString}`);
    },

    async get(id) {
      return await request(`/billing/${id}`);
    }
  },

  // Reports
  reports: {
    async getDashboardStats() {
      return await request('/reports/dashboard');
    },

    async getDetailedReports() {
      return await request('/reports/detailed');
    }
  },

  // Notifications
  notifications: {
    async list(status) {
      const queryString = status ? `?status=${status}` : '';
      return await request(`/notifications${queryString}`);
    },

    async markRead(id) {
      return await request(`/notifications/${id}/read`, {
        method: 'PUT'
      });
    },

    async markAllRead() {
      return await request('/notifications/read-all', {
        method: 'PUT'
      });
    },

    async delete(id) {
      return await request(`/notifications/${id}`, {
        method: 'DELETE'
      });
    },

    async clearAll() {
      return await request('/notifications/clear-all', {
        method: 'DELETE'
      });
    }
  },

  // DB Backup & Restore
  db: {
    async export() {
      return await request('/db/export');
    },
    async import(dump) {
      return await request('/db/import', {
        method: 'POST',
        body: JSON.stringify({ dbBackup: dump })
      });
    }
  }
};
export default api;
