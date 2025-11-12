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
            } catch (err) {
                // handle error
            }
            setLoading(false);
        }
        fetchData();
    }, []);

    // Balance
    const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
    // Income/Expense
    const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
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
                data: Object.values(expenseByCategory),
                backgroundColor: [
                    '#4299E1', '#6d839e', '#f6ad55', '#68d391', '#ed64a6', '#f56565', '#38b2ac', '#ecc94b'
                ],
            }],
        };

        // Line chart: Income vs Expense by date
        const dates = [...new Set(transactions.map(t => t.date ? t.date.slice(0, 10) : ''))].sort();
        const incomeByDate = dates.map(date => transactions.filter(t => t.date && t.date.slice(0, 10) === date && t.amount > 0).reduce((sum, t) => sum + Number(t.amount), 0));
        const expenseByDate = dates.map(date => transactions.filter(t => t.date && t.date.slice(0, 10) === date && t.amount < 0).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0));
        lineData = {
            labels: dates,
            datasets: [
                {
                    label: 'Income',
                    data: incomeByDate,
                    borderColor: '#68d391',
                    backgroundColor: 'rgba(104,211,145,0.2)',
                    fill: true,
                },
                {
                    label: 'Expense',
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
                    <p>${totalBalance}</p>
                </div>
                <div className="kpiCard">{t('home.income')}: ${totalIncome}</div>
                <div className="kpiCard">{t('home.expense')}: ${totalExpense}</div>
                <div className="kpiCard">{t('home.budgets')}: {activeBudgets} {t('home.active')}</div>
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
                                <td>{tx.amount}$</td>
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
                    const percent = b.limit > 0 ? Math.min(100, Math.round((spent / b.limit) * 100)) : 0;
                    return (
                        <div className="budgetCard" key={b._id}>
                            <p>{b.category}: ${spent} {t('home.used')} / ${b.limit}</p>
                            <div className="progressBar">
                                <div className="progress" style={{ width: `${percent}%` }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Analytics Preview */}
            <div className="homeAnalyticsPreview" style={{ position: 'relative', height: 350, overflow: 'visible' }}>
                {/* Pie chart closer to center */}
                <div style={{ position: 'absolute', top: 0, left: '12%', width: 220, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ marginBottom: '16px', marginTop: 0, textAlign: 'center' }}>{t('home.expensesByCategory')}</h3>
                    <div className="miniChart" style={{ width: 200, height: 200 }}>
                        <Pie data={pieData} options={{ plugins: { legend: { display: true } }, maintainAspectRatio: false }} width={200} height={200} />
                    </div>
                </div>
                {/* Line chart closer to center */}
                <div style={{ position: 'absolute', top: 0, right: '8%', width: 420, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ marginBottom: '16px', marginTop: 0, textAlign: 'center' }}>{t('home.incomeVsExpense')}</h3>
                    <div className="miniChart" style={{ width: 400, height: 200 }}>
                        <Line data={lineData} options={{ plugins: { legend: { display: true } }, scales: { x: { title: { display: true, text: t('home.date') } }, y: { title: { display: true, text: t('home.amount') } } }, maintainAspectRatio: false }} width={400} height={200} />
                    </div>
                </div>
            </div>
            </>}
        </div>
    );
}

export default Home;