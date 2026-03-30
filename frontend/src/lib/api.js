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
  const params = new URLSearchParams();
  if (filters.audience) params.set('audience', filters.audience);
  if (filters.minScore) params.set('min_score', filters.minScore);
  if (filters.urgency) params.set('urgency', filters.urgency);
  const qs = params.toString();
  const res = await request(`/api/leads/${clientId}${qs ? `?${qs}` : ''}`);
  return res.json();
}

export async function getStats(clientId) {
  const res = await request(`/api/stats/${clientId}`);
  return res.json();
}

export async function exportCSV(clientId) {
  const res = await fetch(`${API_URL}/api/leads/${clientId}/export`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
}

export async function getMessages(clientId) {
  const res = await request(`/api/messages/${clientId}`);
  return res.json();
}

export async function getRateStatus(clientId) {
  const res = await request(`/api/rate-status/${clientId}`);
  return res.json();
}

export async function updateSettings(clientId, settings) {
  const res = await request(`/api/clients/${clientId}/settings`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return res.json();
}

export async function updateAutoDM(clientId, enabled, threshold) {
  const res = await request(`/api/clients/${clientId}/auto-dm`, {
    method: 'PUT',
    body: JSON.stringify({ auto_dm_enabled: enabled, dm_score_threshold: threshold }),
  });
  return res.json();
}

export async function scanNow(clientId) {
  const res = await request(`/api/scan/${clientId}`, { method: 'POST' });
  return res.json();
}

export async function getClient(clientId) {
  const res = await request(`/api/clients/${clientId}`);
  return res.json();
}

export async function getTemplates(clientId) {
  const res = await request(`/api/templates/${clientId}`);
  return res.json();
}

export async function createTemplate(clientId, template) {
  const res = await request(`/api/templates/${clientId}`, {
    method: 'POST',
    body: JSON.stringify(template),
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

export async function getRedditConnectURL(clientId) {
  const res = await request(`/api/reddit/connect/${clientId}`);
  return res.json();
}
