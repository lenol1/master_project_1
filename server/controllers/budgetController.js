const { get_objectId } = require('../storage/get_setObjectId');
const Budget = require('../models/budget');

const createBudget = async (req, res) => {
  try {
    const userId = get_objectId();
    if (!userId) return res.status(400).json({ message: 'UserId not found' });

    const { name, limit, startDate, endDate, category, account} = req.body;

    const budget = new Budget({
      userId,
      name,
      limit,
      startDate,
      endDate,
      category,
      account,
      status: 'active'
    });

    const savedBudget = await budget.save();
    res.status(201).json(savedBudget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getBudgetsByUser = async (req, res) => {
  try {
    const userId = get_objectId();
    if (!userId) return res.status(400).json({ message: 'UserId not found' });

    const budgets = await Budget.find({ userId }).sort({ startDate: -1 });
    res.status(200).json(budgets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.accountName) {
      updateData.accountId = updateData.accountName;
      delete updateData.accountName;
    }

    const updatedBudget = await Budget.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedBudget) return res.status(404).json({ message: 'Budget not found' });

    res.status(200).json(updatedBudget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBudget = await Budget.findByIdAndDelete(id);
    if (!deletedBudget) return res.status(404).json({ message: 'Budget not found' });

    res.status(200).json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createBudget,
  getBudgetsByUser,
  updateBudget,
  deleteBudget
};