import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../components/styles/Analytics.css';
import { fetchTransactions } from '../api';
import { fetchAccounts } from '../api.accounts';
import { formatMoney } from '../utils/currency';
import { Pie, Line, Bar } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement } from 'chart.js';
Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement);

function Analytics() {
    const { t } = useTranslation();
    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [preferredCurrency, setPreferredCurrency] = useState(localStorage.getItem('defaultCurrency') || null);
    const [useFxConversion, setUseFxConversion] = useState(localStorage.getItem('useFxConversion') === 'true');
    const [fxRates, setFxRates] = useState(null);
    // Filters
    const [filters, setFilters] = useState({ period: '', category: '', search: '' });
    // Filter transactions
    function filterTransactions(transactions) {
        let filtered = [...transactions];
        // Period filter
        if (filters.period) {
            const now = new Date();
            filtered = filtered.filter(tx => {
                const txDate = new Date(tx.date);
                switch (filters.period) {
                    case 'day':
                        return txDate.toDateString() === now.toDateString();
                    case 'week': {
                        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
                        return txDate >= weekAgo && txDate <= now;
                    }
                    case 'month':
                        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
                    case 'quarter': {
                        const quarter = Math.floor(now.getMonth() / 3);
                        return Math.floor(txDate.getMonth() / 3) === quarter && txDate.getFullYear() === now.getFullYear();
                    }
                    case 'year':
                        return txDate.getFullYear() === now.getFullYear();
                    default:
                        return true;
                }
            });
        }
        // Category filter
        if (filters.category) {
            if (filters.category === 'income') filtered = filtered.filter(tx => tx.amount > 0);
            else if (filters.category === 'expense') filtered = filtered.filter(tx => tx.amount < 0);
        }
        // Search filter
        if (filters.search) {
            const s = filters.search.toLowerCase();
            filtered = filtered.filter(tx =>
                (tx.category && tx.category.toLowerCase().includes(s)) ||
                (tx.description && tx.description.toLowerCase().includes(s)) ||
                (tx.note && tx.note.toLowerCase().includes(s))
            );
        }
        return filtered;
    }

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const txs = await fetchTransactions();
                setTransactions(txs);
                const accs = await fetchAccounts();
                setAccounts(accs);
            } catch (err) {
                // handle error
            }
            setLoading(false);
        }
        fetchData();
    }, []);

    // react to currency settings and fetch rates when needed
    useEffect(() => {
        let mounted = true;
        async function loadRates() {
            if (!useFxConversion || !preferredCurrency) { setFxRates(null); return; }
            const { fetchRates } = await import('../utils/currency');
            const rates = await fetchRates(preferredCurrency);
            if (mounted) setFxRates(rates);
        }
        // pick a preferred currency default if not set and accounts available
        if (!preferredCurrency && accounts && accounts.length > 0) setPreferredCurrency(localStorage.getItem('defaultCurrency') || accounts[0].currency || 'USD');
        loadRates();

        const onChange = () => {
            if (!mounted) return;
            setPreferredCurrency(localStorage.getItem('defaultCurrency') || (accounts[0]?.currency) || 'USD');
            setUseFxConversion(localStorage.getItem('useFxConversion') === 'true');
        };
        window.addEventListener('currencyChanged', onChange);
        return () => { mounted = false; window.removeEventListener('currencyChanged', onChange); };
    }, [preferredCurrency, useFxConversion, accounts]);

    // KPIs
    const totalIncome = Number(transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + Number(t.amount), 0).toFixed(2));
    const totalExpense = Number(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0).toFixed(2));
    // Balance should reflect each account's starting balance plus that account's transactions (same as Home.js)
    const balance = Number(accounts.reduce((sum, acc) => {
        const accTxSum = transactions.filter(t => t.accountId === acc._id).reduce((s, t) => s + Number(t.amount || 0), 0);
        return sum + (Number(acc.balance || 0) + accTxSum);
    }, 0).toFixed(2));
    // Top category by expense
    const expenseByCategory = {};
    transactions.filter(t => t.amount < 0).forEach(t => {
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + Math.abs(Number(t.amount));
    });
    const topCategory = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    // Line chart: Income vs Expense by date
    const dates = [...new Set(transactions.map(t => t.date ? t.date.slice(0, 10) : ''))].sort();
    const incomeByDate = dates.map(date => Number(transactions.filter(t => t.date && t.date.slice(0, 10) === date && t.amount > 0).reduce((sum, t) => sum + Number(t.amount), 0).toFixed(2)));
    const expenseByDate = dates.map(date => Number(transactions.filter(t => t.date && t.date.slice(0, 10) === date && t.amount < 0).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0).toFixed(2)));
    const lineData = {
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

    // Pie chart: Expense by category
    // Sort categories by amount descending so chart & legend are consistent
    const sortedExpenseEntries = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
    const legendLabels = sortedExpenseEntries.map(e => e[0]);
    const legendData = sortedExpenseEntries.map(e => Number(e[1].toFixed(2)));
    const totalExpenseForPie = legendData.reduce((s, v) => s + Number(v || 0), 0);
    const palette = ['#4299E1', '#6d839e', '#f6ad55', '#68d391', '#ed64a6', '#f56565', '#38b2ac', '#ecc94b', '#8b5cf6', '#94a3b8', '#60a5fa', '#a3e635'];
    const pieData = {
        labels: legendLabels,
        datasets: [
            {
                data: legendData,
                backgroundColor: palette.slice(0, legendLabels.length),
                borderColor: '#0f1724',
                borderWidth: 2,
            }
        ]
    };

    // Bar chart: Daily/Weekly spending (by date)
    const barData = {
        labels: dates,
        datasets: [
            {
                label: 'Expense',
                data: expenseByDate,
                backgroundColor: '#4299E1',
            }
        ]
    };

    // Filtered transactions
    const filteredTx = filterTransactions(transactions);
    // client-side pagination for analytics table
    const [visibleCount, setVisibleCount] = useState(10);
    const shownFilteredTx = filteredTx.slice(0, visibleCount);

    // Export CSV
    function exportCSV() {
        const header = ['Category', 'Name', 'Date', 'Amount', 'Note'];
        const rows = filteredTx.map(tx => [tx.category, tx.description, tx.date ? tx.date.slice(0, 10) : '', Number(tx.amount).toFixed(2), tx.note || '-']);
        let csv = header.join(',') + '\n';
        csv += rows.map(r => r.map(x => `"${x}"`).join(',')).join('\n');
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'analytics.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    // Export PDF with charts
    async function exportPDF() {
        const doc = new jsPDF();
        doc.text('Analytics Table', 10, 10);
        let y = 20;
        doc.setFontSize(10);
        doc.text(['Category', 'Name', 'Date', 'Amount', 'Note'].join(' | '), 10, y);
        y += 8;
        filteredTx.forEach(tx => {
            doc.text([
                tx.category,
                tx.description,
                tx.date ? tx.date.slice(0, 10) : '',
                String(Number(tx.amount).toFixed(2)),
                tx.note || '-'
            ].join(' | '), 10, y);
            y += 8;
        });

        // Add charts as images
        const chartSelectors = ['.lineChart', '.pieChart', '.barChart'];
        let chartY = y + 10;
        for (const selector of chartSelectors) {
            const chartDiv = document.querySelector(selector);
            if (chartDiv) {
                // Use html2canvas to render chart
                await html2canvas(chartDiv).then(canvas => {
                    const imgData = canvas.toDataURL('image/png');
                    doc.addPage();
                    doc.text(selector.replace('.', ''), 10, 10);
                    doc.addImage(imgData, 'PNG', 10, 20, 180, 80);
                });
            }
        }
        doc.save('analytics.pdf');
    }

    return (
        <div className="analyticsPage">
            <h1>{t('analytics.title', 'Analytics')}</h1>

            {/* Фільтри */}
            <div className="analyticsFilters">
                <select value={filters.period} onChange={e => setFilters(f => ({ ...f, period: e.target.value }))}>
                    <option value="">{t('analytics.allPeriods', 'All Periods')}</option>
                    <option value="day">{t('analytics.day', 'Day')}</option>
                    <option value="week">{t('analytics.week', 'Week')}</option>
                    <option value="month">{t('analytics.month', 'Month')}</option>
                    <option value="quarter">{t('analytics.quarter', 'Quarter')}</option>
                    <option value="year">{t('analytics.year', 'Year')}</option>
                </select>
                <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
                    <option value="">{t('analytics.allCategories', 'All Categories')}</option>
                    <option value="income">{t('analytics.income', 'Income')}</option>
                    <option value="expense">{t('analytics.expense', 'Expense')}</option>
                </select>
                <input type="text" placeholder={t('analytics.search', 'Search...')} value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
            </div>

            {/* Ключові показники */}
            <div className="analyticsKPI">
                <div className="kpiCard">{t('analytics.totalIncome', 'Total Income')}: {useFxConversion && preferredCurrency ? formatMoney(totalIncome, accounts[0]?.currency || preferredCurrency, preferredCurrency, fxRates, true) : formatMoney(totalIncome, accounts[0]?.currency || preferredCurrency)}</div>
                <div className="kpiCard">{t('analytics.totalExpense', 'Total Expense')}: {useFxConversion && preferredCurrency ? formatMoney(totalExpense, accounts[0]?.currency || preferredCurrency, preferredCurrency, fxRates, true) : formatMoney(totalExpense, accounts[0]?.currency || preferredCurrency)}</div>
                <div className="kpiCard">{t('analytics.balance', 'Balance')}: {useFxConversion && preferredCurrency ? formatMoney(balance, accounts[0]?.currency || preferredCurrency, preferredCurrency, fxRates, true) : formatMoney(balance, accounts[0]?.currency || preferredCurrency)}</div>
                <div className="kpiCard">{t('analytics.topCategory', 'Top Category')}: {topCategory}</div>
            </div>

            {/* Графіки */}
            <div className="analyticsCharts">
                    <div className="chart lineChart">
                        <div className="chartTitle">{t('analytics.incomeVsExpenseOverTime', 'Income vs Expense — by date')}</div>
                        <Line data={lineData} options={{ plugins: { legend: { display: true } }, scales: { x: { title: { display: true, text: t('analytics.date', 'Date') } }, y: { title: { display: true, text: t('analytics.amount', 'Amount') } } } }} />
                </div>
                <div className="chart pieChart" style={{ display: 'flex', alignItems: 'center', gap: 16, height: '350px' }}>
                            <div className="chartTitle">{t('analytics.expensesDonutTitle', 'Expenses breakdown')}</div>
                            <div style={{ flex: 0.6, display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 220, height: 220 }}>
                            <Pie data={pieData} options={{
                                plugins: {
                                    legend: {
                                        display: false
                                    },
                                    tooltip: {
                                                callbacks: {
                                                    label: (ctx) => {
                                                        const value = Number(ctx.parsed || 0);
                                                        const rawPercent = totalExpenseForPie > 0 ? (Number(ctx.parsed || 0) / totalExpenseForPie) * 100 : 0;
                                                        const percentStr = new Intl.NumberFormat(t?.language || 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rawPercent);
                                                        return `${ctx.label}: ${Number(ctx.parsed || 0).toFixed(2)} (${percentStr}%)`;
                                                    }
                                                }
                                    }
                                },
                                maintainAspectRatio: false,
                                cutout: '20%'
                            }} width={220} height={220} />
                        </div>
                                <div style={{ marginTop: 6, color: '#3e4042ff', fontSize: 12 }}>
                                    {t('analytics.totalExpenseShort', 'Total')}: {formatMoney(totalExpense, accounts[0]?.currency || preferredCurrency)}
                                </div>
                    </div>
                    <div style={{ flex: 0.4 }}>
                        <h4 style={{ marginTop: 0 }}>{t('analytics.expensesLegend', 'Expenses by category')}</h4>
                            <div className="pieLegend">
                            {pieData.labels.map((label, idx) => {
                                const value = pieData.datasets[0].data[idx] || 0;
                                const rawPercent = totalExpenseForPie > 0 ? (value / totalExpenseForPie) * 100 : 0;
                                const percentStr = new Intl.NumberFormat(t?.language || 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rawPercent);
                                return (
                                    <div key={label} className="pieLegendRow">
                                        <div>
                                            <div style={{ width: 28, height: 12, background: pieData.datasets[0].backgroundColor[idx], borderRadius: 3, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
                                            <span className="legendLabel">{label}</span>
                                        </div>
                                        <div className="legendPct">{percentStr}%</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="chart barChart">
                    <Bar data={barData} options={{ plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: t('analytics.date', 'Date') } }, y: { title: { display: true, text: t('analytics.expense', 'Expense') } } } }} />
                </div>
            </div>

            {/* Таблиця з деталізацією */}
            <table className="analyticsTable">
                <thead>
                    <tr>
                        <th>{t('analytics.category', 'Category')}</th>
                        <th>{t('analytics.name', 'Name')}</th>
                        <th>{t('analytics.date', 'Date')}</th>
                        <th>{t('analytics.amount', 'Amount')}</th>
                    </tr>
                </thead>
                <tbody>
                    {shownFilteredTx.map(tx => (
                        <tr key={tx._id}>
                            <td>{tx.category}</td>
                            <td>{tx.description}</td>
                            <td>{tx.date ? tx.date.slice(0, 10) : ''}</td>
                            <td>{useFxConversion && preferredCurrency ? formatMoney(tx.amount, accounts.find(a => a._id === tx.accountId)?.currency || accounts[0]?.currency || preferredCurrency, preferredCurrency, fxRates, true) : formatMoney(tx.amount, accounts.find(a => a._id === tx.accountId)?.currency || accounts[0]?.currency || preferredCurrency)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Load more / Show less for analytics table */}
            {filteredTx.length > visibleCount && (
                <div style={{ display: 'flex', gap: '1em', justifyContent: 'center', marginTop: '-15px' }}>
                    <button style={{height:'20px'}} onClick={() => setVisibleCount(c => c + 10)}>{t('data.load')}</button>
                    <button style={{height:'20px'}} onClick={() => setVisibleCount(10)}>{t('data.hide')}</button>
                </div>
            )}

            {/* Експорт */}
            <div className="analyticsExport" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button style={{backgroundColor:'green', height:'30px'}} onClick={exportCSV}>{t('analytics.exportCSV', 'Export CSV')}</button>
                <button style={{backgroundColor:'red', height:'30px'}} onClick={exportPDF}>{t('analytics.exportPDF', 'Export PDF')}</button>
            </div>
        </div>
    );
}


export default Analytics;