import '../components/styles/Home.css';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchTransactions } from '../api';
import { fetchAccounts } from '../api.accounts';
import { useNavigate } from 'react-router-dom';
import { Pie, Line } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js';
Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

function Home() {
    const { t } = useTranslation();
    // Get user info from localStorage
    const userData = (() => {
        const savedUser = localStorage.getItem('userData');
        return savedUser ? JSON.parse(savedUser) : null;
    })();
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const accs = await fetchAccounts();
                setAccounts(accs);
                const txs = await fetchTransactions();
                setTransactions(txs);
                // budgets
                const res = await fetch('http://localhost:5000/budgets/user/me');
                const budg = await res.json();
                setBudgets(budg);
                // financial goals (show user's goals on the home screen)
                try {
                    const gres = await fetch('http://localhost:5000/financial-goals/user/me');
                    const gdata = await gres.json().catch(() => []);
                    setGoals(gdata || []);
                } catch (e) {
                    setGoals([]);
                }
            } catch (err) {
                // handle error
            }
            setLoading(false);
        }
        fetchData();
    }, []);

    // Small helper to render currencies correctly
    const getCurrencySymbol = (cur) => {
        if (!cur) return '$';
        const c = String(cur).toUpperCase();
        if (c === 'UAH' || c === 'UAH') return '₴';
        if (c === 'USD' || c === 'US' || c === '$') return '$';
        if (c === 'EUR' || c === '€') return '€';
        // else return currency code to show (e.g. 'GBP' -> 'GBP')
        return cur;
    };

    const formatMoney = (amount, currency) => {
        const num = Number(amount || 0);
        const symbol = getCurrencySymbol(currency);
        // If symbol equals currency (unknown mapping), show code as suffix
        if (symbol && symbol.length > 1 && symbol.toUpperCase() === String(currency).toUpperCase()) {
            return `${num.toFixed(2)} ${String(currency).toUpperCase()}`;
        }
        return `${num.toFixed(2)}${symbol}`;
    };

    // Balance (initial balance + transactions for each account)
    const totalBalance = accounts.reduce((sum, acc) => {
        const accTxSum = transactions.filter(t => t.accountId === acc._id).reduce((s, t) => s + Number(t.amount || 0), 0);
        return sum + (Number(acc.balance || 0) + accTxSum);
    }, 0);
    // Income/Expense
    const totalIncome = transactions.filter(t => Number(t.amount) > 0).reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalExpense = transactions.filter(t => Number(t.amount) < 0).reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);
    // Budgets active
    const activeBudgets = budgets.length;
    // Recent transactions
    const recentTx = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    // Chart data (only when not loading)
    let pieData = { labels: [], datasets: [{ data: [], backgroundColor: [] }] };
    let lineData = { labels: [], datasets: [] };
    if (!loading && transactions.length > 0) {
        // Pie chart: Expenses by category
        const expenseByCategory = {};
        transactions.filter(t => t.amount < 0).forEach(t => {
            expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + Math.abs(Number(t.amount));
        });
        pieData = {
            labels: Object.keys(expenseByCategory),
            datasets: [{
                data: Object.values(expenseByCategory).map(v => Number(v.toFixed(2))),
                backgroundColor: [
                    '#4299E1', '#6d839e', '#f6ad55', '#68d391', '#ed64a6', '#f56565', '#38b2ac', '#ecc94b'
                ],
            }],
        };

        // Line chart: Income vs Expense by date
        const dates = [...new Set(transactions.map(t => t.date ? t.date.slice(0, 10) : ''))].sort();
        const incomeByDate = dates.map(date => Number(transactions.filter(t => t.date && t.date.slice(0, 10) === date && t.amount > 0).reduce((sum, t) => sum + Number(t.amount), 0).toFixed(2)));
        const expenseByDate = dates.map(date => Number(transactions.filter(t => t.date && t.date.slice(0, 10) === date && t.amount < 0).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0).toFixed(2)));
        lineData = {
            labels: dates,
            datasets: [
                {
                    label: t('chart.income'),
                    data: incomeByDate,
                    borderColor: '#68d391',
                    backgroundColor: 'rgba(104,211,145,0.2)',
                    fill: true,
                },
                {
                    label: t('chart.expense'),
                    data: expenseByDate,
                    borderColor: '#f56565',
                    backgroundColor: 'rgba(245,101,101,0.2)',
                    fill: true,
                }
            ]
        };
    }
    return (
        <div className="homePage">
            <h1>{t('home.greeting', { username: userData?.username || t('home.guest') })}</h1>
            {loading ? <div>{t('home.loading')}</div> : <>
            {/* Summary */}
            <div className="homeSummary">
                <div className="balanceCard">
                    <h3>{t('home.currentBalance')}</h3>
                    {/* If all accounts share the same currency, show that symbol; otherwise use first account or $ */}
                    {(() => {
                        const uniqueCurrencies = Array.from(new Set(accounts.map(a => a.currency).filter(Boolean)));
                        const currencyToUse = uniqueCurrencies.length === 1 ? uniqueCurrencies[0] : (accounts[0]?.currency || 'USD');
                        return <p>{formatMoney(totalBalance, currencyToUse)}</p>;
                    })()}
                </div>
                <div className="kpiCard" style={{position:'inherit', marginTop:'20px'}}>{t('home.income')}: {(() => { const currency = accounts[0]?.currency || 'USD'; return formatMoney(totalIncome, currency); })()}</div>
                <div className="kpiCard" style={{position:'inherit', marginTop:'20px'}}>{t('home.expense')}: {(() => { const currency = accounts[0]?.currency || 'USD'; return formatMoney(totalExpense, currency); })()}</div>
                <div className="kpiCard" style={{position:'inherit', marginTop:'20px'}}>{t('home.budgets')}: {activeBudgets} {t('home.active')}</div>
            </div>

            {/* Quick Actions */}
            <div className="homeActions">
                <button onClick={() => navigate('/transactions')}>{t('home.addTransaction')}</button>
                <button onClick={() => navigate('/budgets')}>{t('home.addBudget')}</button>
                <button onClick={() => navigate('/analytics')}>{t('home.goToAnalytics')}</button>
            </div>

            {/* Latest Transactions */}
            <div className="homeTransactions">
                <h2>{t('home.recentTransactions')}</h2>
                <table>
                    <thead>
                        <tr>
                            <th>{t('home.date')}</th>
                            <th>{t('home.category')}</th>
                            <th>{t('home.name')}</th>
                            <th>{t('home.amount')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentTx.map(tx => (
                            <tr key={tx._id}>
                                <td>{tx.date ? tx.date.slice(0, 10) : ''}</td>
                                <td>{tx.category}</td>
                                <td>{tx.description}</td>
                                <td>{(() => {
                                    const acc = accounts.find(a => a._id === tx.accountId) || accounts[0] || { currency: 'USD' };
                                    return formatMoney(tx.amount, acc.currency);
                                })()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Budget Overview */}
            <div className="homeBudgets">
                <h2>{t('home.budgetsOverview')}</h2>
                {budgets.map(b => {
                    const spent = transactions
                        .filter(tx => tx.category === b.category && new Date(tx.date) >= new Date(b.startDate) && new Date(tx.date) <= new Date(b.endDate))
                        .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
                    const spentRounded = Number(spent.toFixed(2));
                    const percent = b.limit > 0 ? Math.min(100, Math.round((spentRounded / b.limit) * 100)) : 0;
                    return (
                        <div className="budgetCard" key={b._id}>
                            <p>{b.category}: {(() => {
                                const currency = accounts[0]?.currency || 'USD';
                                return `${formatMoney(spentRounded, currency)} ${t('home.used')} / ${formatMoney(Number(b.limit || 0), currency)}`;
                            })()}</p>
                            <div className="progressBar">
                                <div className="progress" style={{ width: `${percent}%` }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>

                    {/* Financial goals preview (replace charts) */}
                        <div className="homeGoalsPreview" style={{ marginTop: 10}}>
                            <div className="goalsPanel">
                                <h2 className="goalsPanelTitle">{t('goal.title', 'Financial Goals')}</h2>
                                {loading ? <div>{t('form.loading')}</div> : (
                                    <div className="goalsListCompact">
                                        {goals && goals.length > 0 ? (
                                            goals.slice(0, 3).map(g => {
                                                const current = Number(g.currentAmount || 0);
                                                const target = Number(g.targetAmount || 0) || 1;
                                                const pct = Math.min(100, Math.round((current / target) * 100));
                                                const currency = g.currency || accounts[0]?.currency || 'USD';
                                                return (
                                                    <div key={g._id || g.id} className="goalCardCompact">
                                                        <div className="goalCardLeft">
                                                            <div className="goalCardName">{g.name}</div>
                                                            <div className="goalCardDeadline">{t('goal.deadline')}: {g.deadline ? new Date(g.deadline).toLocaleDateString() : '-'}</div>
                                                            <div className="goalCardRight">
                                                            <div className="goalAmount">{formatMoney(current, currency)}</div>
                                                            <div className="goalTarget">{t('goal.amount')}: {formatMoney(target, currency)}</div>
                                                        </div>
                                                            <div className="goalProgressRow">
                                                                <div className="goalProgressBar">
                                                                    <div className="goalProgressFill" style={{ width: `${pct}%` }} />
                                                                </div>
                                                                <div className="goalPct">{pct}%</div>
                                                            </div>
                                                            
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="goals-empty">{t('goal.empty')}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
            </>}
        </div>
    );
}

export default Home;