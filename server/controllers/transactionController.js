const Transaction = require('../models/transaction');
const Account = require('../models/account');
const Category = require('../models/category');
const Budget = require('../models/budget');
const { estimateDefaultBudget } = require('../utils/budgetEstimate');
const { get_objectId } = require('../storage/get_setObjectId');
const { round2 } = require('../utils/round');
const { getNameById, getIdByName, normalizeName } = require('../ml/category_map');
const axios = require('axios');

// Use explicit IPv4 so 'localhost' resolution to ::1 doesn't cause ECONNREFUSED on some systems
const ML_API_URL_CATEGORIZE = "http://127.0.0.1:8000/api/v1/categorize";
const ML_API_URL_CORRECT = "http://127.0.0.1:8000/api/v1/submit-correction";

const getTransactionsByUser = async (req, res) => {
    try {
      // Prefer authenticated user id from the request (set by auth middleware).
      // Fallback to the stored objectId for compatibility with older code/tests.
      const userId = (req && req.user && req.user.id) ? req.user.id : get_objectId();
      console.log('[Діагностика] Шукаю транзакції для userId:', userId);

      const transactions = await Transaction.find({ userId: userId })
        .populate('accountId', 'name')
        .sort({ date: -1 });

      console.log('[Діагностика] Знайдено транзакцій:', transactions.length);
      res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Помилка завантаження транзакцій: ' + error.message });
    }
};

const getTransactionsByAccount = async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = (req && req.user && req.user.id) ? req.user.id : get_objectId();

    const transactions = await Transaction.find({ accountId: accountId, userId: userId })
      .populate('accountId', 'name')
      .sort({ date: -1 });
            
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Помилка завантаження транзакцій: ' + error.message });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req && req.user && req.user.id) ? req.user.id : get_objectId();

    const transaction = await Transaction.findOne({ _id: id, userId: userId })
      .populate('accountId', 'name');

    if (!transaction) {
      return res.status(404).json({ error: 'Транзакцію не знайдено' });
    }

    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Помилка завантаження транзакції: ' + error.message });
  }
};

const createTransaction = async (req, res) => {
  console.time("TotalRequestTime");
  console.time("MLRequestTime");
  try {
    const { description, amount, date, accountId, category: clientCategory } = req.body;
    const userId = (req && req.user && req.user.id) ? req.user.id : get_objectId();

    if (!description || amount === undefined || !date || !accountId) {
      return res.status(400).json({ error: 'Будь ласка, заповніть всі поля' });
    }

    let categoryFromML = null;
    try {
      console.log(`[Node.js] Запит до ML API: { desc: "${description}", user: "${userId}" }`);
      const mlResponse = await axios.post(ML_API_URL_CATEGORIZE, {
        description: description,
        user_id: userId
      });
      categoryFromML = mlResponse.data.category || mlResponse.data.category_name || mlResponse.data.category_id || null;
      console.timeEnd("MLRequestTime");
      console.log(`[Node.js] Отримано категорію від ML: ${categoryFromML}`);
    } catch (mlError) {
      console.error("ПОМИЛКА ML API (Categorize):", mlError.message);
    }

    const roundedAmount = round2(amount);
    const txType = Number(roundedAmount) >= 0 ? 'income' : 'expense';
    // Decide final category: prefer client-provided value; otherwise use ML result
    let finalCategory = '';
    if (clientCategory && String(clientCategory).trim().length > 0) {
      finalCategory = String(clientCategory).trim();
      console.log('[Node.js] Using category supplied by client:', finalCategory);
    } else if (categoryFromML) {
      if (typeof categoryFromML === 'number' || /^[0-9]+$/.test(String(categoryFromML))) {
        const mapped = getNameById(Number(categoryFromML));
        finalCategory = mapped || String(categoryFromML);
      } else {
        finalCategory = String(categoryFromML);
      }
    }

    // normalize aliases (e.g. 'Їжа' -> 'Продукти') so saved names are canonical
    finalCategory = normalizeName(finalCategory);

    // category must be present (either chosen explicitly or produced by ML)
    if (!finalCategory || finalCategory.trim() === '') {
      return res.status(400).json({ error: 'Category is required (choose a category or allow ML to predict one).' });
    }

    const newTransaction = new Transaction({
      description,
      amount: roundedAmount,
      type: txType,
      date,
      category: finalCategory,
      accountId: accountId,
      userId: userId
    });
    // Log full payload to help troubleshoot why save might fail
    console.log('[Node.js] Saving transaction payload:', { description, amount: roundedAmount, type: txType, date, category: finalCategory, accountId, userId });
    try {
      await newTransaction.save();
    } catch (saveErr) {
      console.error('[Node.js] Transaction save error:', saveErr.stack || saveErr.message || saveErr);
      return res.status(500).json({ error: 'Failed to save transaction', detail: saveErr.message });
    }

    // ensure Category document exists for this user (auto-create from transaction)
    try {
      const existingCat = await Category.findOne({ name: finalCategory, userId });
      if (!existingCat) {
        const createdCat = await Category.create({ name: finalCategory, type: txType, userId });
        console.log('[Node.js] Created new Category from transaction:', createdCat.name);
      }
    } catch (catErr) {
      console.error('[Node.js] Error creating category from transaction:', catErr.message);
    }

    // ensure basic Budget exists for this category (default limit) to keep budgets page populated
    try {
      const budgetExists = await Budget.findOne({ userId, category: finalCategory });
      if (!budgetExists) {
        // Use estimator with improved defaults (window 6mo, multiplier 1.5, min 500)
        const defaultLimit = await estimateDefaultBudget(userId, finalCategory);
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        await Budget.create({ userId, name: finalCategory, category: finalCategory, limit: defaultLimit, startDate, endDate });
        console.log('[Node.js] Auto-created default Budget for category:', finalCategory, 'limit:', defaultLimit);
      }
    } catch (bErr) {
      console.error('[Node.js] Error creating default budget:', bErr.message);
    }

    // If the client included a previously-predicted category and the user corrected it,
    // forward this correction to the ML service for logging / future training
    try {
      const originalPredicted = req.body && (req.body.originalPredictedCategory || req.body.predictedCategory) ? (req.body.originalPredictedCategory || req.body.predictedCategory) : null;
      if (originalPredicted && originalPredicted !== finalCategory) {
        // Map names to numeric ids when possible; ML expects integers
        const origNorm = normalizeName(originalPredicted);
        const newNorm = normalizeName(finalCategory);
        const originalCategoryId = getIdByName(origNorm) || (Number(origNorm) || null);
        const correctedCategoryId = getIdByName(newNorm) || (Number(newNorm) || null);

        console.log('[Node.js] Sending category correction to ML:', { userId, description, originalPredicted, finalCategory, originalCategoryId, correctedCategoryId });
        axios.post(ML_API_URL_CORRECT, {
          user_id: userId,
          description,
          original_category_id: originalCategoryId,
          corrected_category_id: correctedCategoryId,
          // also send readable names: helps ML service map user-custom names
          original_category_name: originalPredicted || null,
          corrected_category_name: finalCategory || null
        }).then(() => {
          console.log('[Node.js] Correction submitted to ML service successfully');
        }).catch(err => {
          console.warn('[Node.js] Failed to submit correction to ML service:', err.message);
        });
      }
    } catch (corErr) {
      console.warn('[Node.js] Error preparing/sending correction:', corErr.message);
    }

    const account = await Account.findById(accountId);
    if (account) {
      account.balance = round2(Number(account.balance) + Number(roundedAmount));
      await account.save();
    }

    const populatedTransaction = await newTransaction.populate('accountId', 'name');
    console.timeEnd("TotalRequestTime");
    res.status(201).json(populatedTransaction);

  } catch (error) {
    res.status(500).json({ error: 'Помилка створення транзакції: ' + error.message });
  }
};

    const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount, date, category, type } = req.body; 
    const userId = (req && req.user && req.user.id) ? req.user.id : get_objectId();

    const oldTransaction = await Transaction.findOne({ _id: id, userId: userId });
    if (!oldTransaction) {
      return res.status(404).json({ error: 'Транзакцію не знайдено' });
    }
    
    const original_category = oldTransaction.category;

    const roundedAmount = amount !== undefined ? round2(amount) : oldTransaction.amount;

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      { description, amount: roundedAmount, date, category, type },
      { new: true }
    ).populate('accountId', 'name');

    // adjust account balance if amount changed
    if (oldTransaction.amount !== roundedAmount) {
      const acc = await Account.findById(updatedTransaction.accountId);
      if (acc) {
        acc.balance = round2(Number(acc.balance) + Number(roundedAmount) - Number(oldTransaction.amount));
        await acc.save();
      }
    }

    // normalize names for comparison (map synonyms to canonical)
    const origNorm = normalizeName(original_category);
    const newNorm = normalizeName(category);

    if (origNorm && newNorm && origNorm.toString() !== newNorm.toString()) {
      console.log(`[Node.js] Надсилання виправнення до ML API...`);
      // Try to send numeric category IDs to ML correction endpoint. If we only have names,
      // try to convert via getIdByName; otherwise send nulls and ML can decide.
      const originalCategoryId = getIdByName(origNorm) || (Number(origNorm) || null);
      const correctedCategoryId = getIdByName(newNorm) || (Number(newNorm) || null);

      axios.post(ML_API_URL_CORRECT, {
        user_id: userId,
        description: updatedTransaction.description,
        original_category_id: originalCategoryId,
        corrected_category_id: correctedCategoryId,
        original_category_name: original_category || null,
        corrected_category_name: category || null
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
    const userId = (req && req.user && req.user.id) ? req.user.id : get_objectId();

    const transaction = await Transaction.findOneAndDelete({ _id: id, userId: userId });
    if (!transaction) {
      return res.status(404).json({ error: 'Транзакцію не знайдено' });
    }
    
    const account = await Account.findById(transaction.accountId);
    if (account) {
      account.balance = round2(Number(account.balance) - Number(transaction.amount));
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
  predictCategory,
  predictBatch,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionById
};

// POST /transactions/predict
async function predictCategory (req, res) {
  try {
    const { description } = req.body;
    const userId = (req && req.user && req.user.id) ? req.user.id : get_objectId();

    if (!description || String(description).trim().length === 0) {
      return res.status(400).json({ error: 'description is required for prediction' });
    }

    try {
      const mlResponse = await axios.post(ML_API_URL_CATEGORIZE, { description, user_id: userId });
      const raw = mlResponse.data.category || mlResponse.data.category_name || mlResponse.data.category_id || null;

      let predictedName = null;
      if (raw !== null && raw !== undefined) {
        if (typeof raw === 'number' || /^[0-9]+$/.test(String(raw))) {
          predictedName = getNameById(Number(raw)) || String(raw);
        } else predictedName = String(raw);
      }

      if (!predictedName) {
        // Return an explicit JSON response even when no prediction is available
        return res.status(200).json({ category: null, raw: raw, message: 'no_prediction' });
      }

      return res.status(200).json({ category: predictedName, raw });
    } catch (err) {
      console.error('ML prediction error:', err.message);
      return res.status(502).json({ error: 'ML service error' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// POST /transactions/predict-batch
async function predictBatch(req, res) {
  try {
    const { descriptions } = req.body;
    const userId = (req && req.user && req.user.id) ? req.user.id : get_objectId();

    if (!Array.isArray(descriptions) || descriptions.length === 0) {
      return res.status(400).json({ error: 'descriptions array required' });
    }

    const results = [];
    for (const desc of descriptions) {
      try {
        const mlResponse = await axios.post(ML_API_URL_CATEGORIZE, { description: desc, user_id: userId });
        const raw = mlResponse.data.category || mlResponse.data.category_name || mlResponse.data.category_id || null;
        let predictedName = null;
        if (raw !== null && raw !== undefined) {
          if (typeof raw === 'number' || /^[0-9]+$/.test(String(raw))) {
            predictedName = getNameById(Number(raw)) || String(raw);
          } else predictedName = String(raw);
        }
        results.push({ description: desc, category: predictedName, raw });
      } catch (err) {
        // push null for this item and continue
        results.push({ description: desc, category: null, raw: null, error: err.message });
      }
    }

    return res.status(200).json({ results });
  } catch (err) {
    console.error('Batch ML prediction error:', err.message || err);
    return res.status(500).json({ error: 'Batch prediction failed' });
  }
}