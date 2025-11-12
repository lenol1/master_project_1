const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');

router.post('/', budgetController.createBudget);
router.get('/user/:userId', budgetController.getBudgetsByUser);
router.put('/:id', budgetController.updateBudget);
router.delete('/:id', budgetController.deleteBudget);

module.exports = router;