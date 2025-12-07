import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../components/styles/FinancialGoals.css';
import { formatMoney, fetchRates } from '../utils/currency';

function FinancialGoals() {
  const { t } = useTranslation();
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preferredCurrency, setPreferredCurrency] = useState(localStorage.getItem('defaultCurrency') || 'USD');
  const [useFxConversion, setUseFxConversion] = useState(localStorage.getItem('useFxConversion') === 'true');
  const [fxRates, setFxRates] = useState(null);

  // Fetch goals from backend
  useEffect(() => {
    const fetchGoals = async () => {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:5000/financial-goals/user/1');
        const data = await res.json();
        setGoals(data);
      } catch (err) {
        setError('Failed to fetch goals');
      } finally {
        setLoading(false);
      }
    };
    fetchGoals();
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!preferredCurrency) setPreferredCurrency(localStorage.getItem('defaultCurrency') || 'USD');
    async function loadRates() {
      if (!useFxConversion || !preferredCurrency) { setFxRates(null); return; }
      const r = await fetchRates(preferredCurrency);
      if (mounted) setFxRates(r);
    }
    loadRates();

    const onChange = () => {
      setPreferredCurrency(localStorage.getItem('defaultCurrency') || 'USD');
      setUseFxConversion(localStorage.getItem('useFxConversion') === 'true');
    };
    window.addEventListener('currencyChanged', onChange);
    return () => { mounted = false; window.removeEventListener('currencyChanged', onChange); };
  }, [preferredCurrency, useFxConversion]);

  // Handle form input change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle form submit (create goal)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/financial-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Failed to create goal');
      const newGoal = await res.json();
      setGoals([...goals, newGoal]);
      setForm({ name: '', targetAmount: '', currentAmount: '', deadline: '', category: '' });
    } catch (err) {
      setError('Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete goal
  const handleDelete = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/financial-goals/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete goal');
      setGoals(goals.filter(goal => goal._id !== id));
    } catch (err) {
      setError('Failed to delete goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="budgetsPage">
  <h1 className="goalsTitle">{t('header.financialGoals')}</h1>
      <div className="goal-section">
        <form className="addGoalForm" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder={t('goal.goal')}
            value={form.name}
            onChange={handleChange}
            required
          />
          <input
            type="number"
            name="targetAmount"
            placeholder={t('goal.amount')}
            value={form.targetAmount}
            onChange={handleChange}
            required
          />
          <input
            type="number"
            name="currentAmount"
            placeholder={t('goal.current')}
            value={form.currentAmount}
            onChange={handleChange}
          />
          <input
            type="date"
            name="deadline"
            value={form.deadline}
            onChange={handleChange}
            required
          />
          <button type="submit" disabled={loading}>{t('goal.add')}</button>
        </form>
  {error && <div className="goals-empty">{error}</div>}
      </div>
      <div className="goal-section">
        <div className="goalsList">
          {loading ? (
            <div className="goals-empty">{t('form.loading')}</div>
          ) : goals.length === 0 ? (
            <div className="goals-empty">{t('goal.empty')}</div>
          ) : (
            goals.map(goal => {
              // Format deadline to YYYY-MM-DD
              let deadline = '';
              if (goal.deadline) {
                const d = new Date(goal.deadline);
                deadline = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
              }
              return (
                <div className="goalCard" key={goal._id || goal.id}>
                  <h3>{goal.name}</h3>
                  <p><strong>{t('goal.amount')}:</strong> {useFxConversion && preferredCurrency ? formatMoney(goal.targetAmount, preferredCurrency, preferredCurrency, fxRates, true) : formatMoney(goal.targetAmount, preferredCurrency)}</p>
                  <p><strong>{t('goal.current')}:</strong> {useFxConversion && preferredCurrency ? formatMoney(goal.currentAmount, preferredCurrency, preferredCurrency, fxRates, true) : formatMoney(goal.currentAmount, preferredCurrency)}</p>
                  <p><strong>{t('goal.deadline')}:</strong> {deadline}</p>
                  <div className="progressBar">
                    <div
                      className="progressFill"
                      style={{ width: `${(goal.currentAmount / goal.targetAmount) * 100}%` }}
                    />
                  </div>
                  <div className="actions">
                    <button
                      style={{ minWidth: '100px' }}
                      onClick={() => handleDelete(goal._id || goal.id)}
                      disabled={loading}
                    >
                      {t('form.delete')}
                    </button>
                    <form
                      style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const amount = e.target.elements.funds.value;
                        if (!amount) return;
                        try {
                          const res = await fetch(`http://localhost:5000/financial-goals/${goal._id || goal.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ currentAmount: Number(goal.currentAmount) + Number(amount) })
                          });
                          if (!res.ok) throw new Error('Failed to add funds');
                          const updatedGoal = await res.json();
                          setGoals(goals.map(g => (g._id === updatedGoal._id ? updatedGoal : g)));
                          e.target.reset();
                        } catch (err) {
                          setError(t('goal.addFundsError'));
                        }
                      }}
                    >
                      <input
                        type="number"
                        name="funds"
                        min="1"
                        placeholder={t('goal.addamount')}
                        style={{ width: '160px', borderRadius: '5px', padding: '0.5em', fontSize: '14px' }}
                      />
                      <button
                        type="submit"
                        style={{ minWidth: '170px', padding: '0.5em 1em', fontSize: '14px' }}
                        disabled={loading}
                      >
                        {t('goal.addamount')}
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default FinancialGoals;
