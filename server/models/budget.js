const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  limit: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
  status: { type: String, enum: ['active', 'completed', 'overspent'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Budget', budgetSchema);
