const { get_objectId } = require('../storage/get_setObjectId');
const FinancialGoal = require('../models/financialGoal');

const createGoal = async (req, res) => {
  try {
    const userId = get_objectId();
    if (!userId) return res.status(400).json({ message: 'UserId not found' });

    const { name, targetAmount, currentAmount, deadline, category } = req.body;

    const goal = new FinancialGoal({
      userId,
      name,
      targetAmount,
      currentAmount,
      deadline,
      category
    });

    const savedGoal = await goal.save();
    res.status(201).json(savedGoal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getGoalsByUser = async (req, res) => {
  try {
    const userId = get_objectId();
    if (!userId) return res.status(400).json({ message: 'UserId not found' });

    const goals = await FinancialGoal.find({ userId }).sort({ deadline: 1 });
    res.status(200).json(goals);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedGoal = await FinancialGoal.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedGoal) return res.status(404).json({ message: 'Goal not found' });

    res.status(200).json(updatedGoal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedGoal = await FinancialGoal.findByIdAndDelete(id);
    if (!deletedGoal) return res.status(404).json({ message: 'Goal not found' });

    res.status(200).json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createGoal,
  getGoalsByUser,
  updateGoal,
  deleteGoal
};