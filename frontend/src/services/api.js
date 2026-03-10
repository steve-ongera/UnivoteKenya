const BASE = '/api';

export const getToken = () => localStorage.getItem('uvk_token');
export const setToken = (t) => localStorage.setItem('uvk_token', t);
export const removeToken = () => localStorage.removeItem('uvk_token');
export const getUser = () => { try { return JSON.parse(localStorage.getItem('uvk_user')); } catch { return null; } };
export const setUser = (u) => localStorage.setItem('uvk_user', JSON.stringify(u));
export const removeUser = () => localStorage.removeItem('uvk_user');

const req = async (endpoint, opts = {}) => {
  const token = getToken();
  const headers = { ...opts.headers };
  if (token) headers['Authorization'] = `Token ${token}`;
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${endpoint}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.non_field_errors?.[0] || data?.detail ||
      Object.values(data)?.[0]?.[0] || 'An error occurred.';
    throw new Error(msg);
  }
  return data;
};

export const authAPI = {
  login: (d) => req('/auth/login/', { method: 'POST', body: JSON.stringify(d) }),
  logout: () => req('/auth/logout/', { method: 'POST' }),
  me: () => req('/auth/me/'),
  passwordReset: (d) => req('/auth/password-reset/', { method: 'POST', body: JSON.stringify(d) }),
  passwordResetConfirm: (d) => req('/auth/password-reset-confirm/', { method: 'POST', body: JSON.stringify(d) }),
};

export const studentAPI = {
  registerVoter: (d) => req('/student/register-voter/', { method: 'POST', body: JSON.stringify(d) }),
  castVote: (d) => req('/student/cast-vote/', { method: 'POST', body: JSON.stringify(d) }),
  myVotes: (electionId) => req(`/student/my-votes/?election_id=${electionId}`),
  voterStatus: (electionId) => req(`/student/voter-status/?election_id=${electionId}`),
};

export const electionAPI = {
  list: () => req('/elections/'),
  active: () => req('/elections/active/'),
  get: (id) => req(`/elections/${id}/`),
  create: (d) => req('/elections/', { method: 'POST', body: JSON.stringify(d) }),
  update: (id, d) => req(`/elections/${id}/`, { method: 'PATCH', body: JSON.stringify(d) }),
  liveResults: (id) => req(`/elections/${id}/live-results/`),
};

export const candidateAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/candidates/?${q}`);
  },
  create: (fd) => req('/candidates/', { method: 'POST', body: fd }),
  update: (id, fd) => req(`/candidates/${id}/`, { method: 'PATCH', body: fd }),
  delete: (id) => req(`/candidates/${id}/`, { method: 'DELETE' }),
  approve: (id) => req(`/candidates/${id}/approve/`, { method: 'POST' }),
  setRunningMate: (id, deputy_id) => req(`/candidates/${id}/set-running-mate/`, { method: 'POST', body: JSON.stringify({ deputy_id }) }),
};

export const iebcAPI = {
  getStudents: (params = {}) => { const q = new URLSearchParams(params).toString(); return req(`/iebc/students/?${q}`); },
  registerStudent: (d) => req('/iebc/students/', { method: 'POST', body: JSON.stringify(d) }),
  getVoterRegistrations: (params = {}) => { const q = new URLSearchParams(params).toString(); return req(`/iebc/voter-registrations/?${q}`); },
  reviewRegistration: (id, d) => req(`/iebc/voter-registrations/${id}/review/`, { method: 'POST', body: JSON.stringify(d) }),
  dashboardStats: () => req('/iebc/dashboard-stats/'),
};

export const announcementAPI = {
  list: () => req('/announcements/'),
  create: (d) => req('/announcements/', { method: 'POST', body: JSON.stringify(d) }),
};

export const choicesAPI = {
  all: () => req('/choices/all/'),
};