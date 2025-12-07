const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/transactions';

function normalizeTransaction(tx) {
  // ensure accountId is a plain id string for frontend comparisons
  if (tx && tx.accountId && typeof tx.accountId === 'object') {
    tx.accountId = tx.accountId._id || tx.accountId.id || tx.accountId;
  }
  return tx;
}

export async function fetchTransactions() {
  const res = await fetch(`${API_BASE}/user/me`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  const data = await res.json();
  if (Array.isArray(data)) return data.map(normalizeTransaction);
  return data;
}

export async function createTransaction(data) {
  const res = await fetch(`${API_BASE}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    let body = await res.text();
    try { body = JSON.parse(body); } catch(e){}
    throw new Error((body && (body.error || body.message)) ? (body.error || body.message) : `Failed to create transaction (status ${res.status})`);
  }
  const created = await res.json();
  return normalizeTransaction(created);
}

export async function updateTransaction(id, data) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update transaction');
  const updated = await res.json();
  return normalizeTransaction(updated);
}

export async function deleteTransaction(id) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete transaction');
  return res.json();
}