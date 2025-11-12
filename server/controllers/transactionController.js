const { get_objectId } = require('../storage/get_setObjectId');
const Transaction = require('../models/transaction');

const createTransaction = async (req, res) => {
  try {
    const userId = get_objectId();
    if (!userId) return res.status(400).json({ message: 'UserId not found' });

    const { accountId, type, category, amount, date, description } = req.body;

    const transaction = new Transaction({
      userId,
      accountId,
      type,
      category,
      amount,
      date,
      description
    });

    const savedTransaction = await transaction.save();
    res.status(201).json(savedTransaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getTransactionsByUser = async (req, res) => {
  try {
    const userId = get_objectId();
    if (!userId) return res.status(400).json({ message: 'UserId not found' });

    const transactions = await Transaction.find({ userId }).sort({ date: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getTransactionsByAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    const transactions = await Transaction.find({ accountId }).sort({ date: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedTransaction = await Transaction.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedTransaction) return res.status(404).json({ message: 'Transaction not found' });

    res.status(200).json(updatedTransaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTransaction = await Transaction.findByIdAndDelete(id);
    if (!deletedTransaction) return res.status(404).json({ message: 'Transaction not found' });

    res.status(200).json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createTransaction,
  getTransactionsByUser,
  getTransactionsByAccount,
  updateTransaction,
  deleteTransaction
};