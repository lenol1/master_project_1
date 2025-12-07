const mongoose = require('mongoose');
const Transaction = require('../models/transaction');

/**
 * Estimate a default monthly budget for a category using transaction history.
 * Strategy:
 *  - Look back N months (default 6) and compute per-month absolute expense sums for the category
 *  - Use the median of monthly sums as the robust estimate (falls back to mean)
 *  - Apply a multiplier (default 1.5) to allow a buffer
 *  - Enforce a minimum (default 500) and round to nearest 10
 */
async function estimateDefaultBudget(userId, category, months = 6, multiplier = 1.5, minLimit = 500) {
  try {
    if (!userId || !category) return minLimit;

    // compute cutoff date
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1); // start of earliest month

    // fetch expense transactions (amount < 0) for this user/category in window
    const docs = await Transaction.find({
      userId: mongoose.Types.ObjectId(userId),
      category: category,
      amount: { $lt: 0 },
      date: { $gte: start }
    }).select('amount date').lean();

    if (!docs || docs.length === 0) return minLimit;

    // group sums by year-month
    const sumsByMonth = {};
    docs.forEach(d => {
      const dt = new Date(d.date);
      const key = `${dt.getFullYear()}-${dt.getMonth() + 1}`;
      sumsByMonth[key] = (sumsByMonth[key] || 0) + Math.abs(Number(d.amount));
    });

    const sums = Object.values(sumsByMonth);
    if (sums.length === 0) return minLimit;

    // use median for robustness
    sums.sort((a, b) => a - b);
    let median;
    if (sums.length % 2 === 1) median = sums[(sums.length - 1) / 2];
    else median = (sums[sums.length / 2 - 1] + sums[sums.length / 2]) / 2;

    const base = median || (sums.reduce((a, b) => a + b, 0) / sums.length);
    let suggested = Math.ceil(base * multiplier);

    // clamp and round to nearest 10
    suggested = Math.max(minLimit, suggested);
    suggested = Math.ceil(suggested / 10) * 10;

    return suggested;
  } catch (err) {
    console.error('estimateDefaultBudget err', err);
    return minLimit;
  }
}

module.exports = { estimateDefaultBudget };
