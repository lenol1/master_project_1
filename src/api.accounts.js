// API for accounts
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/accounts';


export async function fetchAccounts() {
  const res = await fetch(`${API_BASE}/user/me`);
  if (!res.ok) throw new Error('Failed to fetch accounts');
  return res.json();
}

export async function createAccount(data) {
  const res = await fetch(`${API_BASE}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create account');
  return res.json();
}

export async function deleteAccount(id) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete account');
  return res.json();
}

export async function updateAccount(id, data) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update account');
  return res.json();
}
