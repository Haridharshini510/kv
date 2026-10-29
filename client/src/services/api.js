const API_BASE = 'http://localhost:3001/api/v1';

function getToken() {
  return localStorage.getItem('kv_token');
}

function setToken(token) {
  localStorage.setItem('kv_token', token);
}

function clearToken() {
  localStorage.removeItem('kv_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  getToken,
  setToken,
  clearToken,

  login: (pin) => request('/auth/login', { method: 'POST', body: JSON.stringify({ pin }) }),

  getShops: () => request('/shops'),
  getTodaySummary: () => request('/shops/today-summary'),
  createShop: (shop) => request('/shops', { method: 'POST', body: JSON.stringify(shop) }),
  getShop: (id) => request(`/shops/${id}`),
  updateShop: (id, data) => request(`/shops/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getProducts: () => request('/products'),
  createProduct: (product) => request('/products', { method: 'POST', body: JSON.stringify(product) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  createSalesEntry: (entry) => request('/sales-entries', { method: 'POST', body: JSON.stringify(entry) }),
  createQuickSalesEntry: (entry) => request('/sales-entries/quick', { method: 'POST', body: JSON.stringify(entry) }),
  getSalesEntries: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/sales-entries?${query}`);
  },
  getSalesEntry: (id) => request(`/sales-entries/${id}`),
  updateSalesEntry: (id, data) => request(`/sales-entries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  cancelSalesEntry: (id) => request(`/sales-entries/${id}/cancel`, { method: 'POST' }),

  getInvoices: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/invoices?${query}`);
  },
  getInvoice: (id) => request(`/invoices/${id}`),
  generateDailyInvoice: (data) => request('/invoices/daily', { method: 'POST', body: JSON.stringify(data) }),
  finalizeInvoice: (id) => request(`/invoices/${id}/finalize`, { method: 'POST' }),
  getInvoicePrint: (id) => request(`/invoices/${id}/print`),
};
