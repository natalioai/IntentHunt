const API_URL = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `Request failed (${res.status})`);
  }
  return res;
}

export async function login(email, password) {
  const res = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function register(email, password, businessName) {
  const res = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, business_name: businessName }),
  });
  return res.json();
}

export async function getLeads(clientId, filters = {}) {
  const params = new URLSearchParams({ client_id: clientId });
  if (filters.audience_type) params.set('audience_type', filters.audience_type);
  if (filters.min_score) params.set('min_score', filters.min_score);
  if (filters.urgency) params.set('urgency', filters.urgency);
  const res = await request(`/api/leads?${params.toString()}`);
  return res.json();
}

export async function getStats(clientId) {
  const res = await request(`/api/leads/stats?client_id=${clientId}`);
  return res.json();
}

export async function exportCSV(clientId) {
  const res = await fetch(`${API_URL}/api/leads/export?client_id=${clientId}`);
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}

export async function getMessages(clientId) {
  const res = await request(`/api/messages?client_id=${clientId}`);
  return res.json();
}

export async function getRateStatus(clientId) {
  const res = await request(`/api/messages/rate-status?client_id=${clientId}`);
  return res.json();
}

export async function updateSettings(clientId, settings) {
  const res = await request('/api/scanner/settings', {
    method: 'PUT',
    body: JSON.stringify({ client_id: clientId, ...settings }),
  });
  return res.json();
}

export async function updateAutoDM(clientId, enabled, threshold) {
  const res = await request(`/api/clients/${clientId}/auto-dm`, {
    method: 'PUT',
    body: JSON.stringify({ auto_dm_enabled: enabled, auto_dm_threshold: threshold }),
  });
  return res.json();
}

export async function scanNow(clientId) {
  const res = await request('/api/scanner/scan-now', {
    method: 'POST',
    body: JSON.stringify({ client_id: clientId }),
  });
  return res.json();
}

export async function getClient(clientId) {
  const res = await request(`/api/clients/${clientId}`);
  return res.json();
}

export async function getTemplates(clientId) {
  const res = await request(`/api/templates?client_id=${clientId}`);
  return res.json();
}

export async function createTemplate(clientId, template) {
  const res = await request('/api/templates', {
    method: 'POST',
    body: JSON.stringify({ client_id: clientId, ...template }),
  });
  return res.json();
}

export async function updateTemplate(id, template) {
  const res = await request(`/api/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(template),
  });
  return res.json();
}

export async function deleteTemplate(id) {
  const res = await request(`/api/templates/${id}`, { method: 'DELETE' });
  return res.json();
}

export function getRedditConnectURL(clientId) {
  return `${API_URL}/api/auth/reddit/connect?client_id=${clientId}`;
}
