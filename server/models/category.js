const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // null для глобальних категорій
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
