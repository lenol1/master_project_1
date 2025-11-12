const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require("../models/user");
const { save_objectId } = require('../storage/get_setObjectId');

router.post("/", async (req, res) => {
    const { login, password, googleData, githubData } = req.body;
    try {
        let user;
        if (googleData) {
            user = await User.findOne({ email: googleData.email });
            if (!user) {
                const newUser = new User({
                    username: googleData.name,
                    email: googleData.email,
                    password: "",
                    picture: googleData.picture,
                });
                user = await newUser.save();
            }
            save_objectId(user.id);
            return res.status(200).json({
                message: "Login successful",
                email: user.email,
                username: user.username,
                picture: user.picture
            });
        } else if (githubData?.code) {
            const githubCode = githubData.code;
            const clientId = 'Ov23liOC3UYcEnwFK3Uy';
            const clientSecret = '1a1c78b4a1ab82ca2ca7b4c021b7cb2030b00188';

            console.log('GitHub code received:', githubCode);
            const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code: githubCode
                })
            });
            const tokenData = await tokenRes.json();
            console.log('Token response from GitHub:', tokenData);

            const accessToken = tokenData.access_token;
            if (!accessToken) {
                console.error('No access token received from GitHub');
                return res.status(400).json({ message: 'GitHub login failed' });
            }

            // Отримання даних користувача
            const userRes = await fetch('https://api.github.com/user', {
                headers: { Authorization: `token ${accessToken}` }
            });
            const githubUser = await userRes.json();

            let email = githubUser.email;

            // Якщо email прихований або null — отримуємо з /user/emails
            if (!email) {
                const emailsRes = await fetch('https://api.github.com/user/emails', {
                    headers: { Authorization: `token ${accessToken}` }
                });
                const emailsData = await emailsRes.json();

                if (Array.isArray(emailsData) && emailsData.length > 0) {
                    // беремо головний email або перший
                    email = emailsData.find(e => e.primary)?.email || emailsData[0].email;
                } else {
                    // email не знайдений
                    return res.status(400).json({ message: 'Email not available from GitHub' });
                }
            }

            // Пошук користувача у БД
            let user = await User.findOne({ email });
            if (!user) {
                // Створюємо нового користувача
                user = await new User({
                    username: githubUser.login,
                    email,
                    password: "", // OAuth
                    picture: githubUser.avatar_url || "",
                }).save();
            }

            save_objectId(user.id);
            return res.status(200).json({
                message: "Login successful",
                email: user.email,
                username: user.username,
                picture: user.picture
            });
        } else if (googleData === null && githubData === null) {
            user = await User.findOne({
                $or: [
                    { email: login },
                    { username: login }]
            });
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ message: "Invalid password" });
            }
            save_objectId(user.id);
            res.status(200).json({
                message: "Login successful",
                email: user.email,
                username: user.username,
                picture: user.picture
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;