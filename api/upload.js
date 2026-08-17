// API для загрузки данных аукциона
const { kv } = require('@vercel/kv');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { items, timestamp, source } = req.body;
        
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid data format' });
        }

        const uploadTime = Date.now();
        let newItems = 0;
        let updatedItems = 0;

        // Обрабатываем каждый предмет
        for (const item of items) {
            const itemKey = `item:${item.id}`;
            
            // Получаем существующие данные
            const existing = await kv.get(itemKey);
            
            if (!existing) {
                // Новый предмет
                await kv.set(itemKey, {
                    ...item,
                    firstSeen: uploadTime,
                    lastSeen: uploadTime,
                    priceHistory: [{
                        price: item.price,
                        timestamp: uploadTime
                    }],
                    uploadCount: 1
                });
                newItems++;
            } else {
                // Обновляем существующий
                const updated = {
                    ...existing,
                    ...item,
                    lastSeen: uploadTime,
                    uploadCount: (existing.uploadCount || 1) + 1
                };
                
                // Добавляем в историю цен (максимум 100 записей)
                if (!updated.priceHistory) {
                    updated.priceHistory = [];
                }
                updated.priceHistory.push({
                    price: item.price,
                    timestamp: uploadTime
                });
                
                // Ограничиваем историю
                if (updated.priceHistory.length > 100) {
                    updated.priceHistory = updated.priceHistory.slice(-100);
                }
                
                await kv.set(itemKey, updated);
                updatedItems++;
            }
        }

        // Обновляем статистику
        const statsKey = 'global_stats';
        const stats = await kv.get(statsKey) || {
            totalUploads: 0,
            totalItems: 0,
            lastUpload: null,
            uploadHistory: []
        };
        
        stats.totalUploads++;
        stats.totalItems = newItems + updatedItems;
        stats.lastUpload = uploadTime;
        stats.uploadHistory.push({
            timestamp: uploadTime,
            itemsCount: items.length,
            newItems,
            updatedItems
        });
        
        // Ограничиваем историю загрузок
        if (stats.uploadHistory.length > 1000) {
            stats.uploadHistory = stats.uploadHistory.slice(-1000);
        }
        
        await kv.set(statsKey, stats);
        
        // Сохраняем версию данных
        const versionKey = `version:${uploadTime}`;
        await kv.set(versionKey, {
            timestamp: uploadTime,
            itemsCount: items.length,
            items: items.map(item => ({
                id: item.id,
                price: item.price
            }))
        });

        res.json({
            success: true,
            message: 'Data uploaded successfully',
            newItems,
            updatedItems,
            totalProcessed: items.length,
            uploadTime
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
