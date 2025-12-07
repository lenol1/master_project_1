const Category = require('../models/category');
const { get_objectId } = require('../storage/get_setObjectId');

const getCategories = async (req, res) => {
    try {
        const userId = (req && req.user && req.user.id) ? req.user.id : get_objectId();
        const categories = await Category.find({ userId });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Не вдалося отримати категорії', error });
    }
};

const createCategory = async (req, res) => {
    const { name, type, description } = req.body;
    try {
        const userId = (req && req.user && req.user.id) ? req.user.id : get_objectId();
        const newCategory = new Category({ name, type, description, userId });
        const savedCategory = await newCategory.save();
        res.status(201).json(savedCategory);
    } catch (error) {
        res.status(500).json({ message: 'Не вдалося створити категорію', error });
    }
};

const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, type, description } = req.body;
    try {
        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { name, type, description },
            { new: true }
        );
        res.status(200).json(updatedCategory);
    } catch (error) {
        res.status(500).json({ message: 'Не вдалося оновити категорію', error });
    }
};

const deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        await Category.findByIdAndDelete(id);
        res.status(200).json({ message: 'Категорія видалена' });
    } catch (error) {
        res.status(500).json({ message: 'Не вдалося видалити категорію', error });
    }
};

// Sync categories found in transactions -> ensure Category docs + default Budgets
const syncFromTransactions = async (req, res) => {
    try {
        // prefer explicitly supplied userId (from frontend) -> authenticated user -> fallback
        const bodyUserId = req && req.body && req.body.userId ? req.body.userId : null;
        const userId = bodyUserId || (req && req.user && req.user.id) ? (bodyUserId || req.user.id) : get_objectId();
        console.log('syncFromTransactions called for userId:', userId);

        const Transaction = require('../models/transaction');
        const Budget = require('../models/budget');

        // find distinct category names in user's transactions
        let categories = await Transaction.find({ userId }).distinct('category');
        // defensive normalization: remove falsy/empty names and trim
        categories = (categories || []).map(c => (c || '').toString().trim()).filter(Boolean);

        if (!categories.length) {
            console.log('No categories found in transactions for user', userId);
            return res.status(200).json({ message: 'no_categories_found', created: [] });
        }

        const created = [];
        const updated = [];
        for (const name of categories) {
            // avoid creating duplicates when a similarly-named category already exists
            const exists = await Category.findOne({ userId, name });
            if (!exists) {
                const newCat = await Category.create({ name, type: 'expense', userId });
                created.push(newCat.name);

                // create default budget for this category if none exists
                const now = new Date();
                const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                let defaultLimit = 1000;
                try {
                    const { estimateDefaultBudget } = require('../utils/budgetEstimate');
                    // use improved defaults from estimator: 6-month window, multiplier 1.5, min 500
                    defaultLimit = await estimateDefaultBudget(userId, name);
                } catch (err) {
                    console.warn('estimateDefaultBudget failed for', name, '-> using fallback 1000', err.message);
                }

                const budgetExists = await Budget.findOne({ userId, category: name });
                if (!budgetExists) {
                    await Budget.create({ userId, name: name, category: name, limit: defaultLimit, startDate, endDate });
                } else {
                    // If budget exists but its limit is unexpectedly small, increase to the suggested default
                    try {
                        let changed = false;
                        const currentLimit = Number(budgetExists.limit || 0);
                        if (!isNaN(currentLimit) && currentLimit > 0 && currentLimit < defaultLimit) {
                            budgetExists.limit = defaultLimit;
                            changed = true;
                        }
                        // If budget name still contains trailing '(default)', normalize it
                        if (typeof budgetExists.name === 'string' && /\(default\)/i.test(budgetExists.name)) {
                            budgetExists.name = name; // canonical name
                            changed = true;
                        }

                        if (changed) {
                            await budgetExists.save();
                            updated.push(name);
                        }
                    } catch (uErr) {
                        console.warn('Failed to update existing budget for', name, uErr.message);
                    }
                }
            }
        }

        res.status(200).json({ message: 'sync_completed', created, updated });
    } catch (err) {
        console.error('syncFromTransactions error', err);
        res.status(500).json({ error: 'sync_failed', detail: err && err.message ? err.message : String(err) });
    }
};

module.exports = {
    getCategories,
    createCategory,
    syncFromTransactions,
    updateCategory,
    deleteCategory
};