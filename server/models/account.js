const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['cash', 'bank', 'card', 'wallet', 'other'], default: 'card' },
    currency: { type: String, default: 'UAH' },
    balance: { type: Number, default: 0 },
    bankName: { type: String, default: '' },
    cardNumber: { type: String, default: '' },
    lastSync: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Account', accountSchema);
