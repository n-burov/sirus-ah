// API для получения статистики
const { kv } = require('@vercel/kv');

export default async function handler(req, res) {
    try {
        const statsKey = 'global_stats';
        const stats = await kv.get(statsKey);
        
        if (!stats) {
            return res.json({
                totalUploads: 0,
                totalItems: 0,
                lastUpload: null,
                uploadHistory: []
            });
        }
        
        res.json(stats);
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
