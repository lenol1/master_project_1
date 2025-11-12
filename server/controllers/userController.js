const { User } = require('../models/index');

const createUser = async (req, res) => {
    try {
        const newUser = new User(req.body);
        const user = await newUser.save();
        console.log(user)
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
const updateUser = async (req, res) => {
    try {
        const { firstName, lastName } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.firstname = firstName;
        user.lastname = lastName;
        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
const getUserIdByEmail = async (req, res) => {
    try {
        const { email } = req.params;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ userId: user._id });
    } catch (error) {
        console.error('Error fetching user ID:', error);
        res.status(500).json({ message: 'Server eror' });
    }
};
const getUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
module.exports = {
    createUser,
    updateUser,
    getUserById,
    getUsers, 
    getUserIdByEmail
}