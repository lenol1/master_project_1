import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../components/styles/Transactions.css';

import { fetchTransactions, createTransaction, updateTransaction, deleteTransaction } from '../api';
import { fetchAccounts, createAccount, deleteAccount, updateAccount } from '../api.accounts';

function Transactions() {
  function categorizeTransaction(tx) {
    const mccMap = {
      '5411': 'Продукти',
      '5812': 'Ресторани',
      '4111': 'Транспорт',
      '7995': 'Розваги',
      '6011': 'Банкомати',
      '4829': 'Фінанси',
      '5912': 'Аптека',
      '5541': 'АЗС',
      '5691': 'Одяг',
      '5814': 'Кафе',
      '5921': 'Алкоголь',
      '5942': 'Книги',
      '5732': 'Електроніка',
      '5816': 'Фастфуд',
      '6012': 'Банк',
      '5999': 'Інше',
    };
    const keywordMap = [
      { keyword: 'АТБ', category: 'Продукти' },
      { keyword: 'Сільпо', category: 'Продукти' },
      { keyword: 'Novus', category: 'Їжа' },
      { keyword: 'McDonald', category: 'Фастфуд' },
      { keyword: 'WOG', category: 'АЗС' },
      { keyword: 'Uber', category: 'Транспорт' },
      { keyword: 'Аптека', category: 'Аптека' },
      { keyword: 'Rozetka', category: 'Електроніка' },
      { keyword: 'Книгарня', category: 'Книги' },
      { keyword: 'Кіно', category: 'Розваги' },
    ];
    if (tx.mcc && mccMap[tx.mcc]) return mccMap[tx.mcc];
    if (tx.description) {
      for (const { keyword, category } of keywordMap) {
        if (tx.description.toLowerCase().includes(keyword.toLowerCase())) return category;
      }
    }
    return 'Інше';
  }
  const [showMonoPopup, setShowMonoPopup] = useState(false);
  // monobank import UI
  const [monoDays, setMonoDays] = useState(7);
  const [monoType, setMonoType] = useState('all');
  // new: allow choosing date range for import (max 30 days) and preview results before saving
  const [monoFromDate, setMonoFromDate] = useState(() => {
    const now = new Date();
    const d = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [monoToDate, setMonoToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [monoPreview, setMonoPreview] = useState([]); // fetched transactions to preview
  const [monoPreviewOpen, setMonoPreviewOpen] = useState(false);
  const [selectedAccountForImport, setSelectedAccountForImport] = useState('');
  const [selectedImportIds, setSelectedImportIds] = useState(new Set());
  const IMPORT_MAX_DAYS = 30;
  const IMPORT_MAX_ITEMS = 500;
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  // per-account visible counters for client-side pagination
  const [visibleByAccount, setVisibleByAccount] = useState({});
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ date: '', description: '', category: '', amount: '', type: 'expense', accountId: '' });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: '', type: 'card', currency: 'UAH', balance: 0 });
  const [editAccountId, setEditAccountId] = useState(null);
  const [editAccountForm, setEditAccountForm] = useState({ name: '', type: 'card', currency: 'UAH', balance: 0 });
  const [monoLoading, setMonoLoading] = useState(false);
    // currency formatting helpers
    const getCurrencySymbol = (cur) => {
      if (!cur) return '$';
      const c = String(cur).toUpperCase();
      if (c === 'UAH') return '₴';
      if (c === 'USD' || c === '$') return '$';
      if (c === 'EUR' || c === '€') return '€';
      return cur; // show code if unknown
    };

    const formatMoney = (amount, currency) => {
      const num = Number(amount || 0);
      const symbol = getCurrencySymbol(currency);
      if (symbol && symbol.toUpperCase() === String(currency).toUpperCase()) return `${num.toFixed(2)} ${String(currency).toUpperCase()}`;
      return `${num.toFixed(2)}${symbol}`;
    };

  const [monoError, setMonoError] = useState(null);
  const [monoToken, setMonoToken] = useState('');
  const fetchMonobankTransactions = async ({ days = monoDays, type = monoType, fromDate = null, toDate = null } = {}) => {
    if (!monoToken) {
      setMonoError('Введіть токен Monobank!');
      return;
    }
    setMonoLoading(true);
    setMonoError(null);
    try {
      // Allow explicit from/to date (prefer), otherwise use days window
      let fromTs, toTs;
      if (fromDate && toDate) {
        const fromMs = new Date(fromDate + 'T00:00:00').getTime();
        const toMs = new Date(toDate + 'T23:59:59').getTime();
        // validate range
        const diffDays = Math.ceil((toMs - fromMs) / (24 * 3600 * 1000));
        if (diffDays < 0) throw new Error('End date must be after start date');
        if (diffDays > IMPORT_MAX_DAYS) throw new Error(`Date range too large, max ${IMPORT_MAX_DAYS} days`);
        fromTs = Math.floor(fromMs / 1000);
        toTs = Math.floor(toMs / 1000);
      } else {
        const now = Math.floor(Date.now() / 1000);
        const from = now - days * 24 * 60 * 60;
        fromTs = from; toTs = now;
      }

      const url = `https://api.monobank.ua/personal/statement/0/${fromTs}/${toTs}`;
      const res = await fetch(url, {
        headers: { 'X-Token': monoToken }
      });
      if (!res.ok) throw new Error('Monobank API error: ' + res.status);
      let monoTxs = await res.json();
      if (type === 'income') monoTxs = monoTxs.filter(tx => tx.amount >= 0);
      if (type === 'expense') monoTxs = monoTxs.filter(tx => tx.amount < 0);
      let mapped = monoTxs.map(tx => ({
        date: new Date(tx.time * 1000).toISOString().slice(0, 10),
        description: tx.description || `MCC: ${tx.mcc}` || 'Monobank',
        // quick local categorization for preview (the server will re-run ML on actual save)
        category: categorizeTransaction(tx),
        amount: tx.amount / 100,
        type: tx.amount >= 0 ? 'income' : 'expense',
        accountId: accounts[0]?._id || '',
        raw: tx
      }));

      // enforce maximum items for safety
      if (mapped.length > IMPORT_MAX_ITEMS) {
        mapped = mapped.slice(0, IMPORT_MAX_ITEMS);
      }
      // Instead of auto-saving, show preview modal for user to pick account/rows
      setMonoPreview(mapped);
      setMonoPreviewOpen(true);
      // get ML predictions in batch to replace quick local predictions
      try {
        const descriptions = mapped.map(m => m.description);
        if (descriptions.length > 0) {
          const res = await fetch('http://localhost:5000/transactions/predict-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descriptions, user_id: localStorage.getItem('userId') })
          });
          if (res.ok) {
            const body = await res.json();
            const results = body.results || [];
            // merge predictions into preview data
            setMonoPreview(prev => prev.map((item, idx) => ({ ...item, predictedCategory: results[idx] && results[idx].category ? results[idx].category : item.category, category: results[idx] && results[idx].category ? results[idx].category : item.category })));
          }
        }
      } catch (err) {
        console.warn('Batch prediction for preview failed', err.message);
      }
      // pre-select first account if available
      setSelectedAccountForImport(accounts[0]?._id || '');
    } catch (err) {
      setMonoError(err.message);
    }
    setMonoLoading(false);
  };

  // toggle selection for import row
  const toggleImportSelect = (index) => {
    setSelectedImportIds(prev => {
      const s = new Set(prev);
      if (s.has(index)) s.delete(index); else s.add(index);
      return s;
    });
  };

  const selectAllPreview = (checked) => {
    if (checked) {
      const allIds = new Set(monoPreview.map((_, i) => i));
      setSelectedImportIds(allIds);
    } else setSelectedImportIds(new Set());
  };

  // Save selected preview transactions to backend
  const saveSelectedPreview = async () => {
    if (!selectedAccountForImport) {
      setError('Please choose an account to import to');
      return;
    }
    if (selectedImportIds.size === 0) {
      setError('No transactions selected');
      return;
    }
    setLoading(true);
    const toSave = Array.from(selectedImportIds).map(i => ({ ...monoPreview[i], accountId: selectedAccountForImport }));
    const created = [];
    for (const tx of toSave) {
      try {
        // The backend tends to call ML to predict category if empty; here we send category from preview
        const payload = {
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          accountId: tx.accountId,
          category: tx.category
        };
        // if ML predicted one category but user selected another in preview, include the original predicted value
        if (tx.predictedCategory && tx.predictedCategory !== tx.category) {
          payload.originalPredictedCategory = tx.predictedCategory;
        }
        const result = await createTransaction(payload);
        created.push(result);
      } catch (err) {
        console.warn('Failed to import tx:', tx.description, err.message);
      }
    }
    setTransactions(ts => [...created, ...ts]);
    setMonoPreview([]);
    setMonoPreviewOpen(false);
    setShowMonoPopup(false);
    setSelectedImportIds(new Set());
    setLoading(false);
  };
  // inline category creation: allow user to add a category directly from the form
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'expense' });
  const [predictedCategory, setPredictedCategory] = useState('');
  const [modelPolling, setModelPolling] = useState(false);
  const [modelUpdateMessage, setModelUpdateMessage] = useState('');
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editCategoryForm, setEditCategoryForm] = useState({ name: '', type: 'expense' });
  const handleCategoryInputChange = e => {
    const { name, value } = e.target;
    setCategoryForm(f => ({ ...f, [name]: value }));
  };

  const handleEditCategoryInputChange = e => {
    const { name, value } = e.target;
    setEditCategoryForm(f => ({ ...f, [name]: value }));
  };

  // keep this handler for the separate Categories page/modal use elsewhere
  const handleCategorySubmit = async e => {
    e && e.preventDefault && e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: categoryForm.name.trim(),
        type: categoryForm.type
      };
      await fetch('http://localhost:5000/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const cats = await fetch('http://localhost:5000/categories').then(res => res.json());
      setCategories(cats);
      setCategoryForm({ name: '', type: 'expense' });
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Inline new category creation used in transaction form
  const createCategoryInline = async () => {
    if (!newCategoryName || !newCategoryName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const payload = { name: newCategoryName.trim(), type: 'expense' };
      const res = await fetch('http://localhost:5000/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to create category');
      const created = await res.json();
      // refresh categories list and auto-select the new category in the form
      const cats = await fetch('http://localhost:5000/categories').then(r => r.json());
      setCategories(cats);
      setForm(f => ({ ...f, category: created.name }));
      setNewCategoryName('');
      setShowNewCategoryInput(false);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleEditCategoryClick = cat => {
    setEditCategoryId(cat._id);
    setEditCategoryForm({ name: cat.name, type: cat.type });
  };

  const handleEditCategorySubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await fetch(`http://localhost:5000/categories/${editCategoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editCategoryForm)
      });
      const cats = await fetch('http://localhost:5000/categories').then(res => res.json());
      setCategories(cats);
      setEditCategoryId(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleDeleteCategory = async id => {
    setLoading(true);
    setError(null);
    try {
      await fetch(`http://localhost:5000/categories/${id}`, { method: 'DELETE' });
      const cats = await fetch('http://localhost:5000/categories').then(res => res.json());
      setCategories(cats);
      if (editCategoryId === id) setEditCategoryId(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleEditAccountClick = acc => {
    setEditAccountId(acc._id);
    setEditAccountForm({
      name: acc.name,
      type: acc.type,
      currency: acc.currency,
      balance: acc.balance
    });
  };

  const handleEditAccountInputChange = e => {
    const { name, value } = e.target;
    setEditAccountForm(f => ({ ...f, [name]: value }));
  };

  const handleEditAccountSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await updateAccount(editAccountId, editAccountForm);
      const accs = await fetchAccounts();
      setAccounts(accs);
      setEditAccountId(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleDeleteAccount = async id => {
    setLoading(true);
    setError(null);
    try {
      await deleteAccount(id);
      const accs = await fetchAccounts();
      setAccounts(accs);
      if (editAccountId === id) setEditAccountId(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleAccountInputChange = e => {
    const { name, value } = e.target;
    setAccountForm(f => ({ ...f, [name]: value }));
  };

  const handleAccountSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await createAccount(accountForm);
      const accs = await fetchAccounts();
      setAccounts(accs);
      setShowAccountForm(false);
      setAccountForm({ name: '', type: 'card', currency: 'UAH', balance: 0 });
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchTransactions(),
      fetchAccounts(),
      fetch('http://localhost:5000/categories').then(res => res.json())
    ])
      .then(([txs, accs, cats]) => {
        setTransactions(txs);
        setAccounts(accs);
        // initialize visible counts for each account
        const init = {};
        accs.forEach(a => { init[a._id] = 10; });
        setVisibleByAccount(init);
        setCategories(cats);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleAdd = () => {
    setForm({ date: '', description: '', category: '', amount: '', type: 'expense', accountId: accounts[0]?._id || '' });
    setEditingId(null);
  };

  const handleEdit = t => {
    setForm({
      date: t.date ? t.date.slice(0, 10) : '',
      description: t.description || '',
      category: t.category || '',
      amount: Math.abs(t.amount),
      type: t.amount >= 0 ? 'income' : 'expense',
      accountId: t.accountId || accounts[0]?._id || ''
    });
    setEditingId(t._id);
    setShowForm(true);
  };

  const handleDelete = async id => {
    setLoading(true);
    try {
      await deleteTransaction(id);
      setTransactions(ts => ts.filter(t => t._id !== id));
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    if (!form.date || !form.description || !form.amount || !form.accountId) return;

    // If user didn't choose a category, request a prediction from the server first
    let categoryToUse = form.category;
    if (!categoryToUse || String(categoryToUse).trim() === '') {
      try {
        const res = await fetch('http://localhost:5000/transactions/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: form.description, user_id: localStorage.getItem('userId') })
        });
        if (res.ok) {
          const data = await res.json();
          // If ML says there is no prediction explicitly, stop and show message
          if (data && data.category === null) {
            setError('No prediction available for this description');
            setLoading(false);
            return;
          }

          if (data && data.category) {
            categoryToUse = data.category;
            setForm(f => ({ ...f, category: categoryToUse }));
            setPredictedCategory(categoryToUse);
          }
        } else {
          const txt = await res.text();
          throw new Error(txt || 'Prediction failed');
        }
      } catch (err) {
        setError('Failed to predict category: ' + err.message);
        setLoading(false);
        return;
      }
      // After prediction, do not submit immediately — let user review/edit category
      return;
    }
    const amount = form.type === 'expense' ? -Math.abs(Number(form.amount)) : Math.abs(Number(form.amount));
    setLoading(true);
    try {
      if (editingId) {
        const updated = await updateTransaction(editingId, { ...form, amount, category: categoryToUse });
        setTransactions(ts => ts.map(t => t._id === editingId ? updated : t));
      } else {
        // if we had an ML prediction earlier and user changed it, include originalPredictedCategory
        const payload = { ...form, amount, category: categoryToUse };
        if (predictedCategory && predictedCategory !== categoryToUse) payload.originalPredictedCategory = predictedCategory;
        const created = await createTransaction(payload);
        setTransactions(ts => [created, ...ts]);
        // If we corrected an ML-prediction, poll ML for personalized model training status and notify user
        const userId = localStorage.getItem('userId');
        if (userId && predictedCategory && predictedCategory !== categoryToUse) {
          // fetch baseline timestamp first
          try {
            const mlBase = await fetch(`http://127.0.0.1:8000/api/v1/user-model-status/${userId}`).then(r => r.json()).catch(() => ({}));
            const baseline = mlBase && mlBase.last_trained ? mlBase.last_trained : null;
            pollUserModelUpdate(userId, baseline);
          } catch (pollErr) {
            console.warn('Model polling setup failed', pollErr);
          }
        }
      }
      setShowForm(false);
      // after creating, clear prediction cache for next entry
      setPredictedCategory('');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Poll ML server for model update (long-poll style with timeout)
  async function pollUserModelUpdate(userId, baselineLastTrained) {
    setModelPolling(true);
    setModelUpdateMessage('');
    const timeoutMs = 60_000; // 60s max
    const intervalMs = 3000;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/v1/user-model-status/${userId}`);
        if (res.ok) {
          const s = await res.json();
          const last = s && s.last_trained ? s.last_trained : null;
          // if baseline missing and now we have a timestamp OR it's a more recent timestamp
          if (last && (!baselineLastTrained || new Date(last) > new Date(baselineLastTrained))) {
            setModelUpdateMessage((t('transaction.modelUpdated') || 'Personalized model updated'));
            setModelPolling(false);
            // auto-dismiss after 8s
            setTimeout(() => setModelUpdateMessage(''), 8000);
            return;
          }
        }
      } catch (e) {
        // ignore transient network errors
      }
      await new Promise(res => setTimeout(res, intervalMs));
    }
    setModelPolling(false);
  }

  // global running balance across all transactions was confusing and unused; remove it

  return (
    <div className="transactionsPage">
      <h1 style={{ marginBottom: '0em', textAlign: 'center' }}>{t('transaction.title')}</h1>
      {modelUpdateMessage && (
        <div style={{ position: 'fixed', top: 90, right: 20, zIndex: 1200 }}>
          <div style={{ background: '#2f855a', color: '#fff', padding: '10px 14px', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
            {modelUpdateMessage}
          </div>
        </div>
      )}
      <div className="transaction-section" style={{ background: 'rgba(66,153,225,0.04)', borderRadius: '1em', padding: '1.5em', marginBottom: '2em', marginTop: '1em' }}>
        <div className="filters" style={{ justifyContent: 'center', display: 'flex', gap: '1em', alignItems: 'center' }}>
          <input type="date" placeholder={t('filters.from')} />
          <input type="date" placeholder={t('filters.to')} />
          <select>
            <option value="">{t('filters.allCategories')}</option>
          </select>
          <select>
            <option value="">{t('filters.allTypes')}</option>
            <option value="income">{t('filters.income')}</option>
            <option value="expense">{t('filters.expense')}</option>
          </select>
          <input type="text" placeholder={t('filters.searchDescription')} />
          <button>{t('filters.apply')}</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1.5em', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '2em' }}>
        <button className="addTransaction" onClick={() => setShowAccountForm(f => !f)} style={{ background: 'none', border: 'none', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '0.5em', fontSize: '1em', color: '#4299E1', cursor: 'pointer' }} title={t('account.addAccount')}>
          <img src={'/materials/add.png'} alt={t('account.addAccount')} style={{ width: 28, height: 28 }} />
          <span>{t('account.addAccount')}</span>
        </button>
        {accounts && accounts.length > 0 && (
          <button
            className="addTransaction"
            onClick={() => {
              if (showForm) {
                setShowForm(false);
              } else {
                handleAdd();
                setShowForm(true);
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5em',
              fontSize: '1em',
              color: '#4299E1',
              cursor: 'pointer',
              opacity: 1
            }}
            title={t('transaction.addTransaction')}
          >
            <img src={'/materials/add.png'} alt={t('transaction.addTransaction')} style={{ width: 28, height: 28 }} />
            <span>{t('transaction.addTransaction')}</span>
          </button>
        )}
        <button className="addTransaction" onClick={() => setShowMonoPopup(true)} disabled={monoLoading} style={{ background: 'none', border: 'none', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '0.5em', fontSize: '1em', color: '#4299E1', cursor: monoLoading ? 'not-allowed' : 'pointer', opacity: monoLoading ? 0.5 : 1 }}
          title="Monobank import">
          <img src={'/materials/add.png'} alt="Monobank import" style={{ width: 28, height: 28 }} />
          <span>{t('transaction.importMonobank') || 'Monobank'}</span>
        </button>
      </div>
      {monoError && <div style={{ color: 'red', textAlign: 'center', marginBottom: '1em' }}>Monobank: {monoError}</div>}
      {showMonoPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '1em', padding: '2em 2.5em', minWidth: '380px', boxShadow: '0 2px 16px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1em', textAlign: 'center' }}>Імпорт транзакцій з Monobank</h2>
            <form
              onSubmit={e => {
                e.preventDefault();
                // fetch using chosen date range (prefer explicit dates)
                fetchMonobankTransactions({ fromDate: monoFromDate, toDate: monoToDate, type: monoType });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1em', width: '100%', alignItems: 'center' }}
            >
              <div style={{ display: 'block', gap: '25px', width: '100%', justifyContent: 'center' }}>
                <label htmlFor="monoToken" style={{ fontSize: '0.8em', display: 'contents', marginBottom: '6px' }}>
                  Токен Monobank
                </label>
                <input
                  type="text"
                  placeholder="Введіть токен Monobank"
                  value={monoToken}
                  onChange={e => setMonoToken(e.target.value)}
                  style={{ width: '100%', maxWidth: '520px', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1em' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '25px', width: '100%', justifyContent: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="monoFrom" style={{ fontSize: '0.8em', display: 'contents', marginBottom: '6px' }}>З</label>
                  <input id="monoFrom" type="date" value={monoFromDate} onChange={e => setMonoFromDate(e.target.value)} style={{ width: '95%', paddingLeft: '12px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="monoTo" style={{ fontSize: '0.8em', display: 'contents', marginBottom: '6px' }}>По</label>
                  <input id="monoTo" type="date" value={monoToDate} onChange={e => setMonoToDate(e.target.value)} style={{ width: '95%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', width: '100%', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label htmlFor="monoType" style={{ fontSize: '0.8em', display: 'contents', marginBottom: '6px' }}>Тип транзакцій</label>
                  <select id="monoType" value={monoType} onChange={e => setMonoType(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}>
                    <option value="all">Всі</option>
                    <option value="income">Тільки доходи</option>
                    <option value="expense">Тільки витрати</option>
                  </select>
                </div>
                <div style={{ width: 140 }}>
                  <div style={{ fontSize: '0.85em', color: '#666' }}>Обмеження: максимум {IMPORT_MAX_DAYS} днів та {IMPORT_MAX_ITEMS} транзакцій</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1em', width: '100%', justifyContent: 'center', marginTop: '1em' }}>
                <button type="submit" className="addTransaction" disabled={monoLoading} style={{ minWidth: '120px', fontSize: '1em' }}>
                  {monoLoading ? 'Завантаження...' : 'Переглянути'}
                </button>
                <button type="button" className="addTransaction" onClick={() => setShowMonoPopup(false)} style={{ minWidth: '120px', fontSize: '1em', background: '#eee', color: '#333' }}>
                  Закрити
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview modal for Monobank import */}
      {monoPreviewOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div style={{ background: '#fff', borderRadius: '10px', padding: '1.25em', width: '90%', maxWidth: '960px', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8em' }}>
              <h3 style={{ margin: 0 }}>Попередній перегляд імпорту ({monoPreview.length} записів)</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.9em' }}>Рахунок:</label>
                <select value={selectedAccountForImport} onChange={e => setSelectedAccountForImport(e.target.value)} style={{ padding: '6px 8px', borderRadius: 6 }}>
                  <option value="">-- оберіть рахунок --</option>
                  {accounts.map(a => <option key={a._id} value={a._id}>{a.name} ({a.type})</option>)}
                </select>
                <button className="addTransaction" onClick={() => { selectAllPreview(true); }} style={{ minWidth: 120 }}>Вибрати всі</button>
                <button className="addTransaction" onClick={() => { selectAllPreview(false); }} style={{ minWidth: 150, background: '#eee', color: '#333' }}>Зняти виділення</button>
                <button onClick={() => setMonoPreviewOpen(false)} style={{ minWidth: 20, background: '#f7f7f7', color: 'black' }}>X</button>
              </div>
            </div>

            <div style={{ overflow: 'auto', maxHeight: '62vh', borderTop: '1px solid #eee', borderBottom: '1px solid #eee' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                    <th style={{ padding: '8px' }}></th>
                    <th style={{ padding: '8px' }}>Дата</th>
                    <th style={{ padding: '8px' }}>Опис</th>
                    <th style={{ padding: '8px' }}>Категорія (preview)</th>
                    <th style={{ padding: '8px' }}>Сума</th>
                  </tr>
                </thead>
                <tbody>
                  {monoPreview.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>
                        <input type="checkbox" checked={selectedImportIds.has(i)} onChange={() => toggleImportSelect(i)} />
                      </td>
                      <td style={{ padding: '8px', width: 120 }}>{m.date}</td>
                      <td style={{ padding: '8px' }}>{m.description}</td>
                      <td style={{ padding: '8px', width: 240 }}>
                        <select value={m.category} onChange={e => {
                          const val = e.target.value;
                          setMonoPreview(prev => prev.map((it, idx) => idx === i ? ({ ...it, category: val }) : it));
                        }} style={{ width: '100%', padding: '6px' }}>
                          {/* allow predicted option + list of existing categories */}
                          <option value={m.category}>{m.category} (predicted)</option>
                          {categories.map(c => <option key={c._id} value={c.name}>{c.name} ({c.type})</option>)}
                        </select>
                      </td>
                                <td style={{ padding: '8px', width: 120 }}>{(() => {
                                  const importAcc = accounts.find(a => a._id === selectedAccountForImport) || accounts[0] || { currency: 'USD' };
                                  const v = Number(m.amount || 0);
                                  return `${m.type === 'expense' ? '-' : ''}${formatMoney(Math.abs(v), importAcc.currency)}`;
                                })()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button onClick={() => setMonoPreviewOpen(false)} style={{ maxWidth: 120, background: '#eee', color: '#333' }}>Назад</button>
              <button className="addTransaction" onClick={saveSelectedPreview} style={{ minWidth: 160 }}>Імпортувати вибране</button>
            </div>
          </div>
        </div>
      )}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {loading && <div>Loading...</div>}
      {showAccountForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '1em', padding: '2em 2.5em', minWidth: '340px', boxShadow: '0 2px 16px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1em', textAlign: 'center' }}>{t('account.addAccount')}</h2>
            <form className="transactionForm" onSubmit={handleAccountSubmit} style={{ marginBottom: '2em', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <input type="text" name="name" value={accountForm.name} onChange={handleAccountInputChange} placeholder={t('account.name')} required style={{ width: '260px' }} />
              <select name="type" value={accountForm.type} onChange={handleAccountInputChange} required style={{ width: '260px' }}>
                <option value="card">{t('account.type.card')}</option>
                <option value="cash">{t('account.type.cash')}</option>
                <option value="bank">{t('account.type.bank')}</option>
                <option value="wallet">{t('account.type.wallet')}</option>
                <option value="other">{t('account.type.other')}</option>
              </select>
              <input type="text" name="currency" value={accountForm.currency} onChange={handleAccountInputChange} placeholder={t('account.currency')} required style={{ width: '260px' }} />
              <input type="number" name="balance" value={accountForm.balance} onChange={handleAccountInputChange} placeholder={t('account.initialBalance')} required style={{ width: '260px' }} />
              <button type="submit" className="addTransaction" style={{ width: '260px' }}>{t('account.create')}</button>
              <button type="button" className="addTransaction" style={{ width: '260px', background: '#eee', color: '#333' }} onClick={() => setShowAccountForm(false)}>{t('account.cancel')}</button>
            </form>
          </div>
        </div>
      )}
      {accounts && accounts.length > 0 && showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '1em', padding: '2em 2.5em', minWidth: '340px', boxShadow: '0 2px 16px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1em', textAlign: 'center' }}>{editingId ? t('transaction.edit') : t('transaction.addTransaction')}</h2>
            <form className="transactionForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '340px' }}>
              <input type="date" name="date" value={form.date} onChange={handleInputChange} required style={{ width: '260px' }} />
              <input type="text" name="description" value={form.description} onChange={handleInputChange} placeholder={t('transaction.description')} required style={{ width: '260px' }} />
              <div style={{ display: 'block', alignItems: 'center', gap: '8px', width: '260px' }}>
                <select name="category" value={form.category} onChange={e => {
                  const v = e.target.value;
                  if (v === '__new__') {
                    setShowNewCategoryInput(true);
                    // clear form category until new is created
                    setForm(f => ({ ...f, category: '' }));
                  } else {
                    setShowNewCategoryInput(false);
                    handleInputChange(e);
                  }
                }} style={{ flex: 1 }}>
                  <option value="">{t('transaction.category')}</option>
                  <option value="__new__">{t('category.add') ? `${t('category.add')}...` : 'Додати нову...'}</option>
                  {predictedCategory && !categories.some(c => c.name === predictedCategory) && (
                    <option key={`pred-${predictedCategory}`} value={predictedCategory}>{predictedCategory} (predicted)</option>
                  )}
                  {categories.map(cat => (
                    <option key={cat._id} value={cat.name}>{cat.name} {t(`category.${cat.type}`) ? `(${t(`category.${cat.type}`)})` : `(${cat.type})`}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button type="button" className="transaction-btn" style={{ fontSize: '0.9em', padding: '0.35em 0.6em', minWidth:'120px' }} onClick={async () => {
                    setError(null);
                    if (!form.description || String(form.description).trim() === '') {
                      setError('Enter a description first to predict');
                      return;
                    }
                    try {
                      const res = await fetch('http://localhost:5000/transactions/predict', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ description: form.description, user_id: localStorage.getItem('userId') })
                      });
                      if (!res.ok) {
                        const txt = await res.text();
                        throw new Error(txt || 'Prediction failed');
                      }
                      const data = await res.json();
                      if (data && data.category) {
                        setPredictedCategory(data.category);
                        setForm(f => ({ ...f, category: data.category }));
                      } else if (data && data.category === null) {
                        setError('No prediction available for this description');
                      }
                    } catch (err) {
                      setError('Prediction error: ' + err.message);
                    }
                  }} title={t('transaction.predict') || 'Прогнозувати'}>
                    {t('transaction.predict') || 'Прогнозувати'}
                  </button>

                  <button type="button" className="transaction-btn" style={{ fontSize: '0.9em', padding: '0.35em 0.6em', background: '#eee', minWidth:'120px', color: '#333' }} onClick={() => {
                    const lastPred = predictedCategory;
                    setPredictedCategory('');
                    if (lastPred && form.category === lastPred) setForm(f => ({ ...f, category: '' }));
                  }} title={t('transaction.clearPrediction') || 'Очистити прогноз'}>
                    {t('transaction.clearPrediction') || 'Очистити'}
                  </button>

                  <button type="button" className="transaction-btn" style={{ fontSize: '12px', padding: '0.2em 0.6em' }} onClick={() => window.location.href = '/categories'}>
                    {t('category.manage') || '⚙️'}
                  </button>
                </div>
              </div>
              {showNewCategoryInput && (
                <div style={{ display: 'flex', gap: '8px', marginTop: 8, width: '260px' }}>
                  <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder={t('category.name') || 'New category name'} style={{ flex: 1 }} />
                  <button type="button" className="addTransaction" onClick={createCategoryInline} style={{ minWidth: 80 }}>{t('category.add') || 'Add'}</button>
                </div>
              )}
              <input type="number" name="amount" value={form.amount} onChange={handleInputChange} placeholder={t('transaction.amount')} required style={{ width: '260px' }} />
              <select name="type" value={form.type} onChange={handleInputChange} required style={{ width: '260px' }}>
                <option value="income">{t('transaction.income')}</option>
                <option value="expense">{t('transaction.expense')}</option>
              </select>
              <select name="accountId" value={form.accountId} onChange={handleInputChange} required style={{ width: '260px' }}>
                <option value="">{t('transaction.account') || 'Account'}</option>
                {accounts.map(acc => (
                  <option key={acc._id} value={acc._id}>{acc.name} ({acc.type})</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '8px', marginTop: '0.5em', alignItems: 'center' }}> 
              <button type="submit" className="addTransaction" style={{ width: '185px' }}>
                {(!form.category || form.category.trim() === '') ? t('transaction.setCategory') || 'Встановити категорію' : (editingId ? t('transaction.save') : t('transaction.add'))}
              </button>
              <button type="button" className="addTransaction" style={{ width: '110px', background: '#eee', color: '#333' }} onClick={() => setShowForm(false)}>{t('transaction.cancel')}</button>
            </div>
            </form>
          </div>
        </div>
      )}
     
      <div className="transaction-section" style={{ background: 'rgba(66,153,225,0.03)', borderRadius: '1em', padding: '2em', marginBottom: '2em' }}>
        {accounts.map(acc => {
          const accTransactionsSortedAsc = transactions
            .filter(t => t.accountId === acc._id)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
          let runningBalanceCalc = Number(acc.balance) || 0;
          const accTransactionsWithBalance = accTransactionsSortedAsc.map(t => {
            runningBalanceCalc += Number(t.amount) || 0;
            return { ...t, balance: runningBalanceCalc };
          });
          const accTransactionsDisplay = [...accTransactionsWithBalance].sort((a, b) => new Date(b.date) - new Date(a.date));
          const visible = visibleByAccount[acc._id] || 10;
          const shownTransactions = accTransactionsDisplay.slice(0, visible);
          return (
            <div key={acc._id} style={{ marginBottom: '2em' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5em' }}>
                <h2 style={{ fontSize: '1.15em', color: '#4299E1', margin: 0 }}>{acc.name} ({acc.type})</h2>
                <div style={{ display: 'flex', gap: '2em', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <button className="transaction-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5em', minWidth: '120px', justifyContent: 'center', height: '40px' }} onClick={() => handleEditAccountClick(acc)}>
                    <img src={'/materials/edit.png'} alt={t('account.edit')} style={{ width: 28, height: 28, verticalAlign: 'middle' }} />
                    <span style={{ verticalAlign: 'middle', fontSize: '1.08em' }}>{t('account.addAccount')}</span>
                  </button>
                  <button className="transaction-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5em', minWidth: '120px', justifyContent: 'center', height: '40px' }} onClick={() => handleDeleteAccount(acc._id)}>
                    <img src={'/materials/delete.png'} alt={t('account.delete')} style={{ width: 28, height: 28, verticalAlign: 'middle' }} />
                    <span style={{ verticalAlign: 'middle', fontSize: '1.08em' }}>{t('account.addAccount')}</span>
                  </button>
                </div>
              </div>
              {editAccountId === acc._id && (
                <form className="transactionForm" onSubmit={handleEditAccountSubmit} style={{ marginBottom: '1em', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', maxWidth: '340px', margin: '0 auto' }}>
                  <input type="text" name="name" value={editAccountForm.name} onChange={handleEditAccountInputChange} placeholder={t('account.name')} required style={{ width: '260px' }} />
                  <select name="type" value={editAccountForm.type} onChange={handleEditAccountInputChange} required style={{ width: '260px' }}>
                    <option value="card">{t('account.type.card')}</option>
                    <option value="cash">{t('account.type.cash')}</option>
                    <option value="bank">{t('account.type.bank')}</option>
                    <option value="wallet">{t('account.type.wallet')}</option>
                    <option value="other">{t('account.type.other')}</option>
                  </select>
                  <input type="text" name="currency" value={editAccountForm.currency} onChange={handleEditAccountInputChange} placeholder={t('account.currency')} required style={{ width: '260px' }} />
                  <input type="number" name="balance" value={editAccountForm.balance} onChange={handleEditAccountInputChange} placeholder={t('account.initialBalance')} required style={{ width: '260px' }} />
                  <button type="submit" className="addTransaction" style={{ width: '260px' }}>{t('account.save')}</button>
                  <button type="button" className="addTransaction" style={{ width: '260px' }} onClick={() => setEditAccountId(null)}>{t('account.cancel')}</button>
                </form>
              )}
              <table className="transactionTable">
                <thead>
                  <tr>
                    <th>{t('transaction.date')}</th>
                    <th>{t('transaction.description')}</th>
                    <th>{t('transaction.category')}</th>
                    <th>{t('transaction.amount')}</th>
                    <th>{t('transaction.balance')}</th>
                    <th>{t('transaction.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {accTransactionsDisplay.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888' }}>No transactions for this account</td></tr>
                  ) : shownTransactions.map(tx => (
                    <tr key={tx._id}>
                      <td>{tx.date ? tx.date.slice(0, 10) : ''}</td>
                      <td>{tx.description}</td>
                      <td>{tx.category}</td>
                      <td className={tx.amount < 0 ? 'expense' : 'income'}>{formatMoney(tx.amount, acc.currency)}</td>
                      <td>{formatMoney(tx.balance, acc.currency)}</td>
                      <td>
                        <div className="transaction-actions">
                          <button className="transaction-btn" onClick={() => handleEdit(tx)}>
                            <img src={'/materials/edit_t.png'} alt={t('transaction.edit')} style={{ width: 24, height: 24 }} />
                          </button>
                          <button className="transaction-btn" onClick={() => handleDelete(tx._id)}>
                            <img src={'/materials/delete_t.png'} alt={t('transaction.delete')} style={{ width: 24, height: 24 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {accTransactionsDisplay.length > shownTransactions.length && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5em', gap: '0.5em' }}>
                  <button style={{ minWidth: 120, height: '30px' }} onClick={() => setVisibleByAccount(v => ({ ...v, [acc._id]: (v[acc._id] || 10) + 10 }))}>Завантажити ще</button>
                  <button style={{ minWidth: 120 }} onClick={() => setVisibleByAccount(v => ({ ...v, [acc._id]: 10 }))}>Показати менше</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Transactions;