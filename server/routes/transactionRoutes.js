const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

router.post('/', transactionController.createTransaction);
router.post('/predict', transactionController.predictCategory);
router.post('/predict-batch', transactionController.predictBatch);
router.get('/user/:userId', transactionController.getTransactionsByUser);
router.get('/account/:accountId', transactionController.getTransactionsByAccount);
router.put('/:id', transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);
router.get('/user/me', transactionController.getTransactionsByUser);

module.exports = router;