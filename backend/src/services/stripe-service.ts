import Stripe from 'stripe';
import { getDb } from '../db/index.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export interface PaymentLinkRequest {
  userId: number;
  conversationId?: number;
  email: string;
  tier?: string;
}

export interface PaymentLinkResponse {
  url: string;
  sessionId: string;
}

export async function createPaymentLink(
  request: PaymentLinkRequest
): Promise<PaymentLinkResponse> {
  const priceId = process.env.STRIPE_PRODUCT_PRICE_ID;

  if (!priceId) {
    throw new Error('STRIPE_PRODUCT_PRICE_ID not configured');
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: request.email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel`,
    metadata: {
      userId: request.userId.toString(),
      conversationId: request.conversationId?.toString() || '',
    },
  });

  // Store session ID in database
  const sql = getDb();
  if (request.conversationId) {
    await sql`
      UPDATE conversations
      SET stripe_session_id = ${session.id}
      WHERE id = ${request.conversationId} AND user_id = ${request.userId}
    `;
  }

  return {
    url: session.url || '',
    sessionId: session.id,
  };
}

export async function retrievePaymentLink(sessionId: string): Promise<PaymentLinkResponse> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  return {
    url: session.url || '',
    sessionId: session.id,
  };
}

export async function handleCheckoutSessionCompleted(sessionId: string): Promise<void> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (!session.metadata || !session.metadata.userId) {
    throw new Error('Invalid session metadata');
  }

  const userId = parseInt(session.metadata.userId);
  const conversationId = session.metadata.conversationId
    ? parseInt(session.metadata.conversationId)
    : null;

  const sql = getDb();

  // Create order record
  await sql`
    INSERT INTO orders (user_id, conversation_id, stripe_session_id, amount_cents, status)
    VALUES (${userId}, ${conversationId}, ${sessionId}, ${session.amount_total || 0}, 'completed')
  `;

  // Update conversation payment status if applicable
  if (conversationId) {
    await sql`
      UPDATE conversations
      SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${conversationId} AND user_id = ${userId}
    `;
  }
}

export function verifyWebhookSignature(
  body: Buffer,
  signature: string
): Stripe.Event | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  try {
    return stripe.webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return null;
  }
}
