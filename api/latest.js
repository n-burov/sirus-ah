// API для получения последних данных
const { kv } = require('@vercel/kv');

export default async function handler(req, res) {
    try {
        const { limit = 1000, offset = 0 } = req.query;
        
        // Получаем все ключи предметов
        const keys = await kv.keys('item:*');
        const items = [];
        
        // Получаем данные для ограниченного количества предметов
        const startIdx = parseInt(offset);
        const endIdx = Math.min(startIdx + parseInt(limit), keys.length);
        
        for (let i = startIdx; i < endIdx; i++) {
            const key = keys[i];
            const item = await kv.get(key);
            if (item) {
                items.push(item);
            }
        }
        
        res.json({
            total: keys.length,
            items,
            hasMore: endIdx < keys.length
        });
    } catch (error) {
        console.error('Latest error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
