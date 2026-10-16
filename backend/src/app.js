

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();
const allowedOrigins = (process.env.FRONTEND_URLS || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: (requestOrigin, callback) => {
        if (!requestOrigin || allowedOrigins.includes('*') || allowedOrigins.includes(requestOrigin)) {
            return callback(null, true);
        }

        try {
            const hostname = new URL(requestOrigin).hostname;
            if (hostname.endsWith('.vercel.app')) {
                return callback(null, true);
            }
        } catch (_) {}

        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Debugging middleware
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

const authRoutes = require('./routes/auth.routes');
const songRoutes = require('./routes/song.routes');

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/songs', songRoutes);
app.use('/api/auth', authRoutes);

if (process.env.NODE_ENV !== 'production' || process.env.MOODIFY_DEBUG === 'true') {
    const debugRoutes = require('./routes/debug.routes');
    app.use('/api/debug', debugRoutes);
}

// Direct test route to bypass auth.routes.js
app.post('/api/auth/test-register', (req, res) => {
    res.json({ message: 'Test route works' });
});

// 404 Handler for debugging
app.use((req, res) => {
    console.log(`404: ${req.method} ${req.url}`);
    res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

module.exports = app;

