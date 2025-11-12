const express = require('express');
const router = express.Router();
const financialGoalController = require('../controllers/financialGoalController');

router.post('/', financialGoalController.createGoal);
router.get('/user/:userId', financialGoalController.getGoalsByUser);
router.put('/:id', financialGoalController.updateGoal);
router.delete('/:id', financialGoalController.deleteGoal);

module.exports = router;