const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { save_objectId } = require('../storage/get_setObjectId');

const CLIENT_ID = 'Ov23liOC3UYcEnwFK3Uy';
const CLIENT_SECRET = '1a1c78b4a1ab82ca2ca7b4c021b7cb2030b00188';

router.post('/', async (req, res) => {
  const { code } = req.body; // отримуємо код один раз

  if (!code) return res.status(400).json({ message: 'No code provided' });

  try {
    // Обмін коду на access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(400).json({ message: 'GitHub login failed', details: tokenData });
    }

    const accessToken = tokenData.access_token;

    // Отримання даних користувача
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${accessToken}` },
    });
    const githubUser = await userRes.json();

    // Якщо email прихований
    if (!githubUser.email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `token ${accessToken}` },
      });
      const emails = await emailsRes.json();
      githubUser.email = emails.find(e => e.primary)?.email || emails[0]?.email;
    }

    // Створюємо/знаходимо користувача
    let user = await User.findOne({ email: githubUser.email });
    if (!user) {
      user = await new User({
        username: githubUser.login,
        email: githubUser.email,
        password: '', // OAuth
        picture: githubUser.avatar_url || '',
      });
      await user.save();
    }

    save_objectId(user.id);

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.username,
        email: user.email,
        picture: user.picture,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
