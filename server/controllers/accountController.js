const { get_objectId } = require('../storage/get_setObjectId');
const Account = require('../models/account');

const createAccount = async (req, res) => {
  try {
    const userId = get_objectId();
    if (!userId) return res.status(400).json({ message: 'UserId not found' });

    const { name, type, currency, balance, bankName, cardNumber } = req.body;

    const account = new Account({
      userId,
      name,
      type,
      currency,
      balance,
      bankName,
      cardNumber
    });

    const savedAccount = await account.save();
    res.status(201).json(savedAccount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getAccountsByUser = async (req, res) => {
  try {
    const userId = get_objectId();
    if (!userId) return res.status(400).json({ message: 'UserId not found' });

    const accounts = await Account.find({ userId });
    res.status(200).json(accounts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await Account.findById(id);
    if (!account) return res.status(404).json({ message: 'Account not found' });
    res.status(200).json(account);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedAccount = await Account.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedAccount) return res.status(404).json({ message: 'Account not found' });

    res.status(200).json(updatedAccount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAccount = await Account.findByIdAndDelete(id);
    if (!deletedAccount) return res.status(404).json({ message: 'Account not found' });
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createAccount,
  getAccountsByUser,
  getAccountById,
  updateAccount,
  deleteAccount
};