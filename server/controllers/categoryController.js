const Category = require('../models/category');
const { get_objectId } = require('../storage/get_setObjectId');

const getCategories = async (req, res) => {
    try {
        const userId = get_objectId();
        const categories = await Category.find({ userId });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Не вдалося отримати категорії', error });
    }
};

const createCategory = async (req, res) => {
    const { name, type, description } = req.body;
    try {
        const userId = get_objectId();
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

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
};