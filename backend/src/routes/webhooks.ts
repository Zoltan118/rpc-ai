import { Router, Request, Response } from 'express';
import { verifyWebhookSignature, handleCheckoutSessionCompleted } from '../services/stripe-service.js';
import { createApiKey } from '../services/api-key-service.js';

const router = Router();

router.post('/api/webhooks/stripe', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];

  if (!signature || typeof signature !== 'string') {
    res.status(400).json({ error: 'Missing stripe signature' });
    return;
  }

  const rawBody = (req as any).rawBody;

  if (!rawBody) {
    res.status(400).json({ error: 'Missing request body' });
    return;
  }

  try {
    const event = verifyWebhookSignature(rawBody, signature);

    if (!event) {
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        await handleCheckoutSessionCompleted(session.id);

        // Generate API key for user after successful payment
        if (session.metadata?.userId) {
          const userId = parseInt(session.metadata.userId);
          const { key } = await createApiKey(userId, 'Auto-generated from payment');
          console.log(`API key generated for user ${userId}: ${key.substring(0, 10)}...`);
        }

        res.json({ received: true });
        break;
      }

      case 'payment_intent.failed': {
        console.log('Payment failed:', event.data.object);
        res.json({ received: true });
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
        res.json({ received: true });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
