import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
import { useTranslation } from 'react-i18next';
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

    useEffect(() => {
    Chart.register(ArcElement, Tooltip, Legend);
    fetchBudgets();
    fetchTransactions();
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
                        const percent = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
                        const doughnutData = {
                            labels: [t('budget.spent'), t('budget.remaining')],
                            datasets: [
                                {
                                    data: [spent, Math.max(0, limit - spent)],
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
                                            <h3>{b.name}</h3>
                                            <p>{t('budget.category')}: {b.category}</p>
                                            <p>{t('budget.limit')}: ${limit}</p>
                                            <p>{t('budget.spent')}: ${spent}</p>
                                            <p>{t('budget.remaining')}: ${limit - spent}</p>
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