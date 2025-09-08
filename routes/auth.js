const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const router = express.Router();
const usersFilePath = path.join(__dirname, '..', 'data', 'users.json');

// Helper function to read user data
const readUsers = async () => {
    try {
        const usersJson = await fs.readFile(usersFilePath);
        return JSON.parse(usersJson);
    } catch (error) {
        // If file doesn't exist or is empty, return empty array
        return [];
    }
};

// Helper function to write user data
const writeUsers = async (data) => {
    await fs.writeFile(usersFilePath, JSON.stringify(data, null, 2));
};

// Show registration form
router.get('/register', (req, res) => {
    res.render('register');
});

// Handle registration
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const users = await readUsers();

    if (users.find(u => u.email === email)) {
        return res.status(400).send('User with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: crypto.randomUUID(),
        username,
        email,
        password: hashedPassword,
    };

    users.push(newUser);
    await writeUsers(users);
    res.redirect('/login');
});

// Show login form
router.get('/login', (req, res) => {
    res.render('login');
});

// Handle login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const users = await readUsers();
    const user = users.find(u => u.email === email);

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = { id: user.id, username: user.username };
        res.redirect('/posts');
    } else {
        res.status(401).send('Invalid email or password.');
    }
});

// Handle logout
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

module.exports = router;