const blacklistModel = require('../models/blacklist.model');
const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const redis = require('../config/cache');


async function authUser(req, res, next) {
    const token = req.cookies.token;

    if(!token) {
        return res.status(401).json({ message: 'token not provided' });
    }
    let istokenBlacklisted = false;
    if (redis) {
        try {
            istokenBlacklisted = await redis.get(token);
        } catch (error) {
            console.warn('Redis check skipped:', error.code || error.message);
        }
    }

    if (istokenBlacklisted) {
        return res.status(401).json({ message: 'Token is blacklisted' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}


module.exports = {
    authUser
};