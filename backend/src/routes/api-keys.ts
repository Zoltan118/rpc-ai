import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getApiKeysByUser, deleteApiKey } from '../services/api-key-service.js';
import { getDb } from '../db/index.js';

const router = Router();

router.get('/api/api-keys', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Check if user has paid status
    const sql = getDb();
    const paidOrders = await sql`
      SELECT id FROM orders
      WHERE user_id = ${userId} AND status = 'completed'
      LIMIT 1
    `;

    if (paidOrders.length === 0) {
      res.status(403).json({ error: 'API keys only available after payment' });
      return;
    }

    const apiKeys = await getApiKeysByUser(userId);

    // Return keys without exposing the hash
    res.json({
      keys: apiKeys.map((key) => ({
        id: key.id,
        prefix: key.keyPrefix,
        name: key.name,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
      })),
    });
  } catch (error) {
    console.error('Error retrieving API keys:', error);
    res.status(500).json({ error: 'Failed to retrieve API keys' });
  }
});

router.delete('/api/api-keys/:keyId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const keyId = parseInt(req.params.keyId);

    const success = await deleteApiKey(keyId, userId);

    if (!success) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

export default router;
