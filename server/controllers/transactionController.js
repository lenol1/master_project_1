const Transaction = require('../models/transaction');
const Account = require('../models/account');
const axios = require('axios');

const ML_API_URL_CATEGORIZE = "http://localhost:8000/api/v1/categorize";
const ML_API_URL_CORRECT = "http://localhost:8000/api/v1/submit-correction";

const getTransactionsByUser = async (req, res) => {
    try {
        const userId = req.user.id; 

        const transactions = await Transaction.find({ user: userId })
            .populate('account', 'name')
            .populate('category', 'name type icon')
            .sort({ date: -1 });

        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Помилка завантаження транзакцій: ' + error.message });
    }
};

const getTransactionsByAccount = async (req, res) => {
    try {
        const { accountId } = req.params;
        const userId = req.user.id;

        const transactions = await Transaction.find({ account: accountId, user: userId })
            .populate('account', 'name')
            .populate('category', 'name type icon')
            .sort({ date: -1 });
            
        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Помилка завантаження транзакцій: ' + error.message });
    }
};

const getTransactionById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const transaction = await Transaction.findOne({ _id: id, user: userId })
            .populate('account', 'name')
            .populate('category', 'name type icon');

        if (!transaction) {
            return res.status(404).json({ error: 'Транзакцію не знайдено' });
        }

        res.status(200).json(transaction);
    } catch (error) {
        res.status(500).json({ error: 'Помилка завантаження транзакції: ' + error.message });
    }
};

const createTransaction = async (req, res) => {
  try {
    const { description, amount, date, accountId } = req.body;
    const userId = req.user.id;

    if (!description || !amount || !date || !accountId) {
      return res.status(400).json({ error: 'Будь ласка, заповніть всі поля' });
    }

    let categoryIdFromML = null;
    
    try {
      console.log(`[Node.js] Запит до ML API: { desc: "${description}", user: "${userId}" }`);
      
      const mlResponse = await axios.post(ML_API_URL_CATEGORIZE, {
        description: description,
        user_id: userId
      });
      
      categoryIdFromML = mlResponse.data.category_id;
      console.log(`[Node.js] Отримано категорію від ML: ${categoryIdFromML}`);
      
    } catch (mlError) {
      console.error("ПОМИЛКА ML API (Categorize):", mlError.message);
    }

    const newTransaction = new Transaction({
      description,
      amount,
      date,
      category: categoryIdFromML,
      account: accountId,
      user: userId 
    });

    await newTransaction.save();
    
    const account = await Account.findById(accountId);
    if (account) {
      account.balance += amount;
      await account.save();
    }

    const populatedTransaction = await newTransaction.populate('category', 'name type icon');
    res.status(201).json(populatedTransaction);

  } catch (error) {
    res.status(500).json({ error: 'Помилка створення транзакції: ' + error.message });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, date, category } = req.body; 
    const userId = req.user.id;

    const oldTransaction = await Transaction.findOne({ _id: id, user: userId });
    if (!oldTransaction) {
      return res.status(404).json({ error: 'Транзакцію не знайдено' });
    }
    
    const original_category_id = oldTransaction.category;

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      { description, amount, date, category },
      { new: true }
    ).populate('category', 'name type icon');

    if (original_category_id && category && original_category_id.toString() !== category.toString()) {
      
      console.log(`[Node.js] Надсилання виправлення до ML API...`);
      
      axios.post(ML_API_URL_CORRECT, {
        user_id: userId,
        description: updatedTransaction.description,
        original_category_id: original_category_id,
        corrected_category_id: category 
      }).catch(err => {
        console.error("ПОМИЛКА ML API (Correction):", err.message);
      });
    }
    
    res.status(200).json(updatedTransaction);
  } catch (error) {
    res.status(500).json({ error: 'Помилка оновлення транзакції: ' + error.message });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const transaction = await Transaction.findOneAndDelete({ _id: id, user: userId });
    if (!transaction) {
      return res.status(404).json({ error: 'Транзакцію не знайдено' });
    }
    
    const account = await Account.findById(transaction.account);
    if (account) {
      account.balance -= transaction.amount;
      await account.save();
    }
    
    res.status(200).json({ message: 'Транзакцію успішно видалено' });
  } catch (error) {
    res.status(500).json({ error: 'Помилка видалення транзакції: ' + error.message });
  }
};

module.exports = {
  getTransactionsByUser,
  getTransactionsByAccount,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionById
};