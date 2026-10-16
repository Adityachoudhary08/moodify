const userModel = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const blacklistModel = require('../models/blacklist.model');
const redis = require('../config/cache');

async function register(req, res) {
    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, and password are required' });
        }

        const existingUser = await userModel.findOne({
            $or: [
                { email: email },
                { username: username }
            ]
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Email or username already in use' });
        }

        const hash = await bcrypt.hash(password, 10);

        const User = await userModel.create({
            username,
            email,
            password: hash
        });

        const token = jwt.sign({
            id: User._id,
            username: User.username,
        }, process.env.JWT_SECRET, { expiresIn: '3d' });

        res.cookie('token', token);

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: User._id,
                username: User.username,
                email: User.email
            },
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
}



async function login(req, res) {
    try {
        const { username, email, password } = req.body;

        if ((!email && !username) || !password) {
            return res.status(400).json({ message: 'Email/username and password are required' });
        }

        const user = await userModel.findOne({
            $or: [
                { email: email },
                { username: username }
            ]
        }).select('+password');

        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({
            id: user._id,
            username: user.username,
        }, process.env.JWT_SECRET, { expiresIn: '3d' });

        res.cookie('token', token);
        res.status(200).json({
            message: 'User logged in successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
}


async function getMe(req, res) {
    try {
        const user = await userModel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({
            message: 'User fetched successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Error fetching user', error: error.message });
    }
}

async function logout(req, res) {
    try {
        const token = req.cookies.token;
        res.clearCookie('token');

        if (token && redis) {
            await redis.set(token, Date.now().toString(), 'EX', 3 * 24 * 60 * 60);
        }

        res.status(200).json({ message: 'User logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Error logging out', error: error.message });
    }
}


module.exports = {
    register,
    login,
    getMe,
    logout
};
