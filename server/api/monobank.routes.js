const express = require('express');
const router = express.Router();
const { getMonobankTransactions } = require('../api/monobank');

// GET /api/monobank/transactions?token=...
router.get('/transactions', async (req, res) => {
    const token = req.query.token;
    if (!token) {
        return res.status(400).json({ error: 'Token is required' });
    }
    try {
        const transactions = await getMonobankTransactions(token);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
