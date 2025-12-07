import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
import { useTranslation } from 'react-i18next';
import { formatMoney, fetchRates } from '../utils/currency';
import '../components/styles/Budget.css';

function Budgets() {
    const { t } = useTranslation();
    const [budgets, setBudgets] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        limit: '',
        startDate: '',
        endDate: '',
        accountName: ''
    });
    const [errorMessage, setErrorMessage] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editFormData, setEditFormData] = useState({
        name: '',
        category: '',
        limit: '',
        startDate: '',
        endDate: '',
        accountName: ''
    });
    // Видалено функцію додавання суми
    const [transactions, setTransactions] = useState([]);
    const [syncInProgress, setSyncInProgress] = useState(false);
    const [preferredCurrency, setPreferredCurrency] = useState(localStorage.getItem('defaultCurrency') || null);
    const [useFxConversion, setUseFxConversion] = useState(localStorage.getItem('useFxConversion') === 'true');
    const [fxRates, setFxRates] = useState(null);

    useEffect(() => {
    Chart.register(ArcElement, Tooltip, Legend);
    fetchBudgets();
    fetchTransactions();
    // load fx rates if needed
    let mounted = true;
    async function loadRates() {
        if (!useFxConversion || !preferredCurrency) { setFxRates(null); return; }
        const rates = await fetchRates(preferredCurrency);
        if (mounted) setFxRates(rates);
    }
    if (!preferredCurrency) setPreferredCurrency(localStorage.getItem('defaultCurrency') || 'USD');
    loadRates();

    const onChange = () => {
        setPreferredCurrency(localStorage.getItem('defaultCurrency') || 'USD');
        setUseFxConversion(localStorage.getItem('useFxConversion') === 'true');
    };
    window.addEventListener('currencyChanged', onChange);
    return () => { mounted = false; window.removeEventListener('currencyChanged', onChange); };
    }, []);

    const fetchBudgets = async () => {
        try {
            const res = await fetch(`http://localhost:5000/budgets/user/${localStorage.getItem('userId')}`);
            const data = await res.json();
            setBudgets(data);
        } catch (err) {
            console.error(err);
        }
    };

    // Отримати всі транзакції
    const fetchTransactions = async () => {
        try {
            const res = await fetch(`http://localhost:5000/transactions/user/${localStorage.getItem('userId')}`);
            const data = await res.json();
            setTransactions(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddBudget = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/budgets', {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (!response.ok) {
                setErrorMessage(result.message);
                return;
            }
            setFormData({ name: '', category: '', limit: '', startDate: '', endDate: '', accountName: '' });
            fetchBudgets();
        } catch (err) {
            console.error(err);
            setErrorMessage('Internal server error');
        }
    };

    const handleEditClick = (budget) => {
        setEditId(budget._id);
        setEditFormData({
            name: budget.name,
            category: budget.category,
            limit: budget.limit,
            startDate: budget.startDate ? budget.startDate.slice(0,10) : '',
            endDate: budget.endDate ? budget.endDate.slice(0,10) : '',
            accountName: budget.accountName || ''
        });
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`http://localhost:5000/budgets/${editId}`, {
                method: 'PUT',
                body: JSON.stringify(editFormData),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (!response.ok) {
                setErrorMessage(result.message);
                return;
            }
            setEditId(null);
            fetchBudgets();
        } catch (err) {
            console.error(err);
            setErrorMessage('Internal server error');
        }
    };


    const handleDelete = async (id) => {
        try {
            await fetch(`http://localhost:5000/budgets/${id}`, { method: 'DELETE' });
            fetchBudgets();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="budget-container">
            <h1 className="budget-title">{t('budget.budget')}</h1>
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <button
                    className="budget-btn"
                    style={{ marginBottom: '1em', width: '260px', alignSelf: 'flex-end' }}
                    onClick={() => setShowForm(f => !f)}
                >
                    {showForm ? t('form.close') : t('form.addbudget')}
                </button>
                <button
                    className="budget-btn"
                    style={{ marginLeft: '0.5em', marginBottom: '1em', width: '220px', alignSelf: 'flex-end' }}
                    onClick={async () => {
                            setSyncInProgress(true);
                            try {
                                // Call server endpoint to sync categories->categories & budgets from transactions
                                const res = await fetch('http://localhost:5000/categories/sync-from-transactions', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: localStorage.getItem('userId') })
                                });

                                // If network-level failure, fetch will throw and we'll catch below
                                const data = await res.json().catch(() => ({}));
                                if (!res.ok) {
                                    // server returned an error response with details
                                    const errMsg = data && (data.error || data.detail || data.message) ? (data.error || data.detail || data.message) : `HTTP ${res.status}`;
                                    throw new Error(errMsg);
                                }

                                   const createdList = data.created && data.created.length ? ('created: ' + data.created.join(', ')) : '';
                                   const updatedList = data.updated && data.updated.length ? ('updated: ' + data.updated.join(', ')) : '';
                                   const messageParts = [createdList, updatedList].filter(Boolean).join('; ') || 'none';
                                // refresh budgets and transactions
                                await fetchBudgets();
                                await fetchTransactions();
                            } catch (err) {
                                console.error('Sync failed', err);
                            } finally {
                                setSyncInProgress(false);
                            }
                        }}
                disabled={syncInProgress}
                >
                    {syncInProgress ? t('budget.syncing') : t('budget.syncCategoriesToBudgets')}
                </button>
            </div>
            {showForm && (
                <form className="budget-form" onSubmit={handleAddBudget} style={{ marginBottom: '2em', animation: 'fadeIn 0.3s' }}>
                    <input className="budget-input" type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder={t('budget.name')} required />
                    <input className="budget-input" type="text" name="category" value={formData.category} onChange={handleInputChange} placeholder={t('budget.category')} required />
                    <input className="budget-input" type="number" name="limit" value={formData.limit} onChange={handleInputChange} placeholder={t('budget.limit')} required />
                    <input className="budget-input" type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} required />
                    <input className="budget-input" type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} required />
                    <input className="budget-input" type="text" name="accountName" value={formData.accountName} onChange={handleInputChange} placeholder={t('budget.accountNameOptional')} />
                    <button className="budget-btn" type="submit">{t('form.addbudget')}</button>
                    {errorMessage && <p className="budget-empty">{errorMessage}</p>}
                </form>
            )}
            <div className="budget-list">
                {budgets.length === 0 ? (
                    <div className="budget-empty">{t('budget.nobudgets')}</div>
                ) : (
                    budgets.map(b => {
                        // Витрати за категорією за період
                        const spent = transactions
                            .filter(tx => tx.category === b.category && new Date(tx.date) >= new Date(b.startDate) && new Date(tx.date) <= new Date(b.endDate))
                            .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
                        const limit = b.limit || 0;
                        const spentRounded = Number(spent.toFixed(2));
                        const remaining = Number(Math.max(0, limit - spentRounded).toFixed(2));
                        const percent = limit > 0 ? Math.min(100, Math.round((spentRounded / limit) * 100)) : 0;
                        const doughnutData = {
                            labels: [t('budget.spent'), t('budget.remaining')],
                            datasets: [
                                {
                                    data: [spentRounded, remaining],
                                    backgroundColor: [
                                        '#4299E1',
                                        '#6d839eff'
                                    ],
                                    borderWidth: 1,
                                },
                            ],
                        };
                        return (
                            <div className="budget-card" key={b._id}>
                                <div className="budget-card-info">
                                    {editId === b._id ? (
                                        <form className="budget-form" onSubmit={handleEditSubmit} style={{ marginBottom: '1em', animation: 'fadeIn 0.3s' }}>
                                            <input className="budget-input" type="text" name="name" value={editFormData.name} onChange={handleEditInputChange} placeholder={t('budget.name')} required />
                                            <input className="budget-input" type="text" name="category" value={editFormData.category} onChange={handleEditInputChange} placeholder={t('budget.category')} required />
                                            <input className="budget-input" type="number" name="limit" value={editFormData.limit} onChange={handleEditInputChange} placeholder={t('budget.limit')} required />
                                            <input className="budget-input" type="date" name="startDate" value={editFormData.startDate} onChange={handleEditInputChange} required />
                                            <input className="budget-input" type="date" name="endDate" value={editFormData.endDate} onChange={handleEditInputChange} required />
                                            <input className="budget-input" type="text" name="accountName" value={editFormData.accountName} onChange={handleEditInputChange} placeholder={t('budget.accountNameOptional')} />
                                            <button className="budget-btn" type="submit">{t('form.save')}</button>
                                            <button className="budget-btn" type="button" onClick={() => setEditId(null)}>{t('form.cancel')}</button>
                                            {errorMessage && <p className="budget-empty">{errorMessage}</p>}
                                        </form>
                                    ) : (
                                        <>
                                            <h3>{b.name ? b.name.replace(/\s*\(default\)\s*$/i, '') : b.name}</h3>
                                            <p>{t('budget.category')}: {b.category}</p>
                                            <p>{t('budget.limit')}: {useFxConversion && preferredCurrency ? formatMoney(Number(limit), preferredCurrency, preferredCurrency, fxRates, true) : formatMoney(Number(limit), preferredCurrency)}</p>
                                            <p>{t('budget.spent')}: {useFxConversion && preferredCurrency ? formatMoney(spentRounded, preferredCurrency, preferredCurrency, fxRates, true) : formatMoney(spentRounded, preferredCurrency)}</p>
                                            <p>{t('budget.remaining')}: {useFxConversion && preferredCurrency ? formatMoney(remaining, preferredCurrency, preferredCurrency, fxRates, true) : formatMoney(remaining, preferredCurrency)}</p>
                                            <p>{t('budget.period')}: {new Date(b.startDate).toLocaleDateString()} - {new Date(b.endDate).toLocaleDateString()}</p>
                                            <div className="budget-progress">
                                                <div className="budget-progress-bar" style={{ width: `${percent}%` }}></div>
                                            </div>
                                            <div className="budget-actions">
                                                <button className="budget-btn" onClick={() => handleEditClick(b)}>{t('form.edit')}</button>
                                                <button className="budget-btn" onClick={() => handleDelete(b._id)}>{t('form.delete')}</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="budget-card-chart">
                                    <Doughnut data={doughnutData} options={{
                                        cutout: '70%',
                                        plugins: {
                                            legend: { display: false },
                                            tooltip: { enabled: true }
                                        }
                                    }} style={{ maxWidth: 120, marginTop: 72 }} />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            <br />
        </div>
    );
}

export default Budgets;