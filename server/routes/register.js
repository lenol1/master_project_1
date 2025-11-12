const express = require('express');
const router = express.Router();
const User = require("../models/user");
const {save_objectId} = require('../storage/get_setObjectId');

router.post("/", async (req, res) => {
    try {
        const user = new User(req.body);
        let result = await user.save();
        result = result.toObject();
        if (result) {
            delete result.password;
            res.status(200).json({ message: "Registration successful" });
            save_objectId(user.id);
            console.log(result);
        } else {
            console.log("User already registered");
            res.status(400).json({ message: "User already registered" });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "User Is Already Registered" });
    }
});

module.exports = router;