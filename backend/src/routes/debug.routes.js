const express = require('express');
const indianMusicService = require('../service/indianMusic.service');

const router = express.Router();

router.get('/indian-provider', async (req, res) => {
    const query = String(req.query.q || 'Bollywood').trim();
    if (!query) {
        return res.status(400).json({ message: 'Query parameter q is required' });
    }
    try {
        const result = await indianMusicService.debugSearch(query, Number(req.query.limit) || 20);
        return res.json(result);
    } catch (error) {
        return res.status(502).json({
            message: 'Indian provider search failed',
            error: error.message,
            query,
        });
    }
});

module.exports = router;
