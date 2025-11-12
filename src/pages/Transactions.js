import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../components/styles/Transactions.css';

import { fetchTransactions, createTransaction, updateTransaction, deleteTransaction } from '../api';
import { fetchAccounts, createAccount, deleteAccount, updateAccount } from '../api.accounts';

function Transactions() {
  function categorizeTransaction(tx) {
    const mccMap = {
      '5411': 'Їжа',
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
      { keyword: 'АТБ', category: 'Їжа' },
      { keyword: 'Сільпо', category: 'Їжа' },
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
  const [monoDays, setMonoDays] = useState(7);
  const [monoType, setMonoType] = useState('all');
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
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
  const [monoError, setMonoError] = useState(null);
  const [monoToken, setMonoToken] = useState('');
  const fetchMonobankTransactions = async (days = monoDays, type = monoType) => {
    if (!monoToken) {
      setMonoError('Введіть токен Monobank!');
      return;
    }
    setMonoLoading(true);
    setMonoError(null);
    try {
      const now = Math.floor(Date.now() / 1000);
      const from = now - days * 24 * 60 * 60;
      const url = `https://api.monobank.ua/personal/statement/0/${from}/${now}`;
      const res = await fetch(url, {
        headers: { 'X-Token': monoToken }
      });
      if (!res.ok) throw new Error('Monobank API error: ' + res.status);
      let monoTxs = await res.json();
      if (type === 'income') monoTxs = monoTxs.filter(tx => tx.amount >= 0);
      if (type === 'expense') monoTxs = monoTxs.filter(tx => tx.amount < 0);
      const mapped = monoTxs.map(tx => ({
        date: new Date(tx.time * 1000).toISOString().slice(0, 10),
        description: tx.description || `MCC: ${tx.mcc}` || 'Monobank',
        category: categorizeTransaction(tx),
        amount: tx.amount / 100,
        type: tx.amount >= 0 ? 'income' : 'expense',
        accountId: accounts[0]?._id || '',
      }));
      const createdTxs = [];
      for (const tx of mapped) {
        try {
          const res = await fetch('http://localhost:5000/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tx)
          });
          if (res.ok) {
            const created = await res.json();
            createdTxs.push(created);
          }
        } catch (err) { }
      }
      setTransactions(ts => [...createdTxs, ...ts]);
      setShowMonoPopup(false);
    } catch (err) {
      setMonoError(err.message);
    }
    setMonoLoading(false);
  };
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'expense' });
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

  const handleCategorySubmit = async e => {
    e.preventDefault();
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
    if (!form.date || !form.description || !form.category || !form.amount || !form.accountId) return;
    const amount = form.type === 'expense' ? -Math.abs(Number(form.amount)) : Math.abs(Number(form.amount));
    setLoading(true);
    try {
      if (editingId) {
        const updated = await updateTransaction(editingId, { ...form, amount });
        setTransactions(ts => ts.map(t => t._id === editingId ? updated : t));
      } else {
        const created = await createTransaction({ ...form, amount });
        setTransactions(ts => [created, ...ts]);
      }
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  let runningBalance = 0;
  const transactionsWithBalance = transactions.map(t => {
    runningBalance += t.amount;
    return { ...t, balance: runningBalance };
  });

  return (
    <div className="transactionsPage">
      <h1 style={{ marginBottom: '1em', textAlign: 'center' }}>{t('transaction.title')}</h1>
      <div className="transaction-section" style={{ background: 'rgba(66,153,225,0.04)', borderRadius: '1em', padding: '1.5em', marginBottom: '2em', marginTop: '1em' }}>
        <div className="filters" style={{ justifyContent: 'center', display: 'flex', gap: '1em', alignItems: 'center' }}>
          <input type="date" placeholder={t('filters.from')} />
          <input type="date" placeholder={t('filters.to')} />
          <select>
            <option value="">{t('filters.allCategories')}</option>
            <option value="food">{t('categories.food')}</option>
            <option value="transport">{t('categories.transport')}</option>
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
        <button className="addTransaction" onClick={() => setShowMonoPopup(true)} disabled={monoLoading} style={{ background: 'none', border: 'none', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '0.5em', fontSize: '1em', color: '#4299E1', cursor: monoLoading ? 'not-allowed' : 'pointer', opacity: monoLoading ? 0.5 : 1 }} title="Monobank import">
          <img src={'/materials/add.png'} alt="Monobank import" style={{ width: 28, height: 28 }} />
          <span>{t('transaction.importMonobank') || 'Monobank'}</span>
        </button>
      </div>
      {monoError && <div style={{ color: 'red', textAlign: 'center', marginBottom: '1em' }}>Monobank: {monoError}</div>}
      {showMonoPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '1em', padding: '2em 2.5em', minWidth: '340px', boxShadow: '0 2px 16px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1em', textAlign: 'center' }}>Завантажити транзакції Monobank</h2>
            <form
              onSubmit={e => {
                e.preventDefault();
                fetchMonobankTransactions(monoDays, monoType);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.2em', width: '100%', alignItems: 'center' }}
            >
              <input
                type="text"
                placeholder="Введіть токен Monobank"
                value={monoToken}
                onChange={e => setMonoToken(e.target.value)}
                style={{ width: '100%', maxWidth: '320px', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1em' }}
                required
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5em', width: '100%', alignItems: 'center', marginTop: '0.5em' }}>
                <div style={{ width: '100%' }}>
                  <label htmlFor="monoDays" style={{ fontSize: '1em', marginBottom: '6px', display: 'block' }}>Кількість днів</label>
                  <input
                    id="monoDays"
                    type="number"
                    min={1}
                    max={90}
                    value={monoDays}
                    onChange={e => setMonoDays(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1em', marginTop: '2px', boxSizing: 'border-box' }}
                    required
                  />
                </div>
                <div style={{ width: '100%' }}>
                  <label htmlFor="monoType" style={{ fontSize: '1em', marginBottom: '6px', display: 'block' }}>Тип транзакцій</label>
                  <select
                    id="monoType"
                    value={monoType}
                    onChange={e => setMonoType(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1em', marginTop: '2px', boxSizing: 'border-box' }}
                  >
                    <option value="all">Всі</option>
                    <option value="income">Тільки доходи</option>
                    <option value="expense">Тільки витрати</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1em', width: '100%', justifyContent: 'center', marginTop: '1em' }}>
                <button type="submit" className="addTransaction" disabled={monoLoading} style={{ minWidth: '120px', fontSize: '1em' }}>
                  {monoLoading ? 'Завантаження...' : 'Завантажити'}
                </button>
                <button type="button" className="addTransaction" onClick={() => setShowMonoPopup(false)} style={{ minWidth: '120px', fontSize: '1em', background: '#eee', color: '#333' }}>
                  Скасувати
                </button>
              </div>
            </form>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '260px' }}>
                <select name="category" value={form.category} onChange={handleInputChange} required style={{ flex: 1 }}>
                  <option value="">{t('transaction.category')}</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat.name}>{cat.name} {t(`category.${cat.type}`) ? `(${t(`category.${cat.type}`)})` : `(${cat.type})`}</option>
                  ))}
                </select>
                <button type="button" className="transaction-btn" style={{ fontSize: '1em', padding: '0.2em 0.6em' }} onClick={() => setShowCategoryModal(true)}>
                  {t('category.manage') || '⚙️'}
                </button>
              </div>
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
              <button type="submit" className="addTransaction" style={{ width: '260px' }}>{editingId ? t('transaction.save') : t('transaction.add')}</button>
              <button type="button" className="addTransaction" style={{ width: '260px', background: '#eee', color: '#333' }} onClick={() => setShowForm(false)}>{t('transaction.cancel')}</button>
            </form>
          </div>
        </div>
      )}
      {showCategoryModal && (
        <div className="category-modal" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '1em', padding: '2em', minWidth: '340px', boxShadow: '0 2px 16px rgba(0,0,0,0.15)' }}>
            <h2 style={{ marginTop: 0 }}>{t('category.manageTitle') || 'Manage Categories'}</h2><br />
            <form onSubmit={handleCategorySubmit} style={{ display: 'flex', gap: '8px', marginBottom: '1em', alignItems: 'center', justifyContent: 'center' }}>
              <input type="text" name="name" value={categoryForm.name} onChange={handleCategoryInputChange} placeholder={t('category.name') || 'Name'} required style={{ flex: 1, minWidth: '140px', height: '40px' }} />
              <select name="type" value={categoryForm.type} onChange={handleCategoryInputChange} required style={{ flex: 1, minWidth: '140px', height: '40px' }}>
                <option value="expense">{t('transaction.expense')}</option>
                <option value="income">{t('transaction.income')}</option>
              </select>
              <button type="submit" className="transaction-btn" style={{ flex: 1, minWidth: '120px', height: '40px' }}>{t('category.add') || 'Add'}</button>
            </form>
            {editCategoryId && (
              <form onSubmit={handleEditCategorySubmit} style={{ display: 'flex', gap: '12px', marginBottom: '1em', alignItems: 'center' }}>
                <input type="text" name="name" value={editCategoryForm.name} onChange={handleEditCategoryInputChange} required style={{ flex: 2, minWidth: '120px', height: '36px', fontSize: '0.95em' }} />
                <select name="type" value={editCategoryForm.type} onChange={handleEditCategoryInputChange} required style={{ flex: 1, minWidth: '270px', maxWidth: '390px', height: '44px', fontSize: '1.08em', padding: '6px 16px' }}>
                  <option value="expense">{t('transaction.expense')}</option>
                  <option value="income">{t('transaction.income')}</option>
                </select>
                <button type="submit" className="transaction-btn" style={{ minWidth: '70px', height: '32px', fontSize: '0.92em', padding: '2px 8px' }}>{t('category.save') || 'Save'}</button>
                <button type="button" className="transaction-btn" style={{ minWidth: '70px', height: '32px', fontSize: '0.92em', padding: '2px 8px' }} onClick={() => setEditCategoryId(null)}>{t('category.cancel') || 'Cancel'}</button>
              </form>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1em' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px' }}>{t('category.name') || 'Name'}</th>
                  <th style={{ textAlign: 'left', padding: '8px' }}>{t('category.type') || 'Type'}</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>{t('category.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: '#888' }}>No categories</td></tr>
                ) : categories.map(cat => (
                  <tr key={cat._id}>
                    <td style={{ padding: '8px' }}>{cat.name}</td>
                    <td style={{ padding: '8px' }}>{t(`category.${cat.type}`) || cat.type}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button className="transaction-btn" style={{ minWidth: '70px', height: '32px', fontSize: '0.92em', padding: '2px 8px' }} onClick={() => handleEditCategoryClick(cat)}>{t('category.edit') || 'Edit'}</button>
                        <button className="transaction-btn" style={{ minWidth: '70px', height: '32px', fontSize: '0.92em', padding: '2px 8px' }} onClick={() => handleDeleteCategory(cat._id)}>{t('category.delete') || 'Delete'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="transaction-btn" style={{ width: '100%' }} onClick={() => { setShowCategoryModal(false); setEditCategoryId(null); }}>{t('category.close') || t('form.close') || 'Close'}</button>
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
            runningBalanceCalc += t.amount;
            return { ...t, balance: runningBalanceCalc };
          });
          const accTransactionsDisplay = [...accTransactionsWithBalance].sort((a, b) => new Date(b.date) - new Date(a.date));
          return (
            <div key={acc._id} style={{ marginBottom: '2em' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5em' }}>
                <h2 style={{ fontSize: '1.15em', color: '#4299E1', margin: 0 }}>{acc.name} ({acc.type})</h2>
                <div style={{ display: 'flex', gap: '0.5em' }}>
                  <button className="transaction-btn" onClick={() => handleEditAccountClick(acc)}>{t('account.edit')}</button>
                  <button className="transaction-btn" onClick={() => handleDeleteAccount(acc._id)}>{t('account.delete')}</button>
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
                  ) : accTransactionsDisplay.map(tx => (
                    <tr key={tx._id}>
                      <td>{tx.date ? tx.date.slice(0, 10) : ''}</td>
                      <td>{tx.description}</td>
                      <td>{tx.category}</td>
                      <td className={tx.amount < 0 ? 'expense' : 'income'}>{tx.amount}$</td>
                      <td>{tx.balance}$</td>
                      <td>
                        <div className="transaction-actions">
                          <button className="transaction-btn" onClick={() => handleEdit(tx)}>{t('transaction.edit')}</button>
                          <button className="transaction-btn" onClick={() => handleDelete(tx._id)}>{t('transaction.delete')}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Transactions;