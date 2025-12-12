import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createPaymentLink } from '../services/stripe-service.js';
import { createApiKey } from '../services/api-key-service.js';
import { getDb } from '../db/index.js';

const router = Router();

interface PaymentLinkRequest {
  conversationId?: number;
  tier?: string;
}

router.post('/api/payments/link', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { conversationId, tier } = req.body as PaymentLinkRequest;
    const userId = req.userId!;

    // Get user email from database
    const sql = getDb();
    const users = await sql`
      SELECT email FROM users WHERE id = ${userId}
    `;

    if (users.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const email = users[0].email;

    // Create payment link
    const paymentLink = await createPaymentLink({
      userId,
      conversationId,
      email,
      tier,
    });

    res.json({
      url: paymentLink.url,
      sessionId: paymentLink.sessionId,
    });
  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).json({ error: 'Failed to create payment link' });
  }
});

export default router;
