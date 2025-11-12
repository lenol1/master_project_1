const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    firstname:{type: String, required: false, unique:false},
    lastname:{type:String, required:false, unique:false},
    username: {type: String, required: true, unique: true,},
    email: {type: String, required: true, unique: true,},
    picture: {type: String, required: false, unique: true,},
    date: {type: Date, default: Date.now,},
});

userSchema.pre('save', async function(next) {
    const user = this;
    if (!user.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(user.password, salt);
        user.password = hash;
        next();
    } catch (error) {
        next(error);
    }
});

const user = mongoose.model('users', userSchema);
user.createIndexes();
module.exports = user;