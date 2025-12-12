# Stripe Payment Flow - Implementation Guide

## Overview

This document describes the complete Stripe payment integration for the backend, including payment link generation, webhook handling, and API key management.

## Architecture

### Components

1. **Payment Service** (`src/services/stripe-service.ts`)
   - Creates Stripe checkout sessions
   - Handles webhook events
   - Manages payment status updates

2. **API Key Service** (`src/services/api-key-service.ts`)
   - Generates secure API keys
   - Stores hashed keys in database
   - Validates keys on API requests

3. **Routes**
   - `POST /api/payments/link` - Create payment link
   - `POST /api/webhooks/stripe` - Handle Stripe webhooks
   - `GET /api/api-keys` - Retrieve user's API keys
   - `DELETE /api/api-keys/:keyId` - Delete API key

## Database Schema

### conversations table
- `id` (PRIMARY KEY)
- `user_id` (FOREIGN KEY)
- `title` (VARCHAR)
- `payment_status` (VARCHAR) - Values: 'unpaid', 'pending', 'paid', 'failed'
- `stripe_session_id` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### orders table
- `id` (PRIMARY KEY)
- `user_id` (FOREIGN KEY)
- `conversation_id` (FOREIGN KEY)
- `stripe_session_id` (VARCHAR, UNIQUE)
- `amount_cents` (INTEGER)
- `currency` (VARCHAR, DEFAULT 'usd')
- `status` (VARCHAR) - Values: 'pending', 'completed', 'failed'
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### api_keys table
- `id` (PRIMARY KEY)
- `user_id` (FOREIGN KEY)
- `key_hash` (VARCHAR, UNIQUE) - SHA256 hash of the key
- `key_prefix` (VARCHAR) - First 20 characters for display
- `name` (VARCHAR)
- `last_used_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## API Key Generation Flow

1. User completes payment
2. Stripe webhook received: `checkout.session.completed`
3. Order marked as completed in database
4. Conversation payment status updated to 'paid'
5. API key automatically generated and stored (hashed)
6. Key returned only once (shown to user immediately after payment)
7. User can retrieve key prefix and metadata via `GET /api/api-keys`

## API Endpoints

### POST /api/payments/link

Creates a Stripe checkout session for payment.

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "conversationId": 123,
  "tier": "premium"
}
```

**Response**:
```json
{
  "url": "https://checkout.stripe.com/pay/cs_test_...",
  "sessionId": "cs_test_123456"
}
```

**Error Responses**:
- 401: Missing or invalid authorization
- 500: Failed to create payment link

### POST /api/webhooks/stripe

Handles Stripe webhook events.

**Authentication**: Required (Stripe signature verification)

**Request Headers**:
```
stripe-signature: t=timestamp,v1=signature
```

**Webhook Events Handled**:
- `checkout.session.completed` - Payment completed, creates order and API key
- `payment_intent.failed` - Payment failed

**Response**:
```json
{
  "received": true
}
```

**Error Responses**:
- 400: Missing signature or invalid signature
- 500: Webhook processing failed

### GET /api/api-keys

Retrieves all API keys for the authenticated user.

**Authentication**: Required (Bearer token)

**Response**:
```json
{
  "keys": [
    {
      "id": 1,
      "prefix": "sk_0123456789abcdef",
      "name": "Auto-generated from payment",
      "createdAt": "2024-01-15T10:30:00Z",
      "lastUsedAt": "2024-01-15T11:45:00Z"
    }
  ]
}
```

**Error Responses**:
- 401: Missing or invalid authorization
- 403: API keys only available after payment
- 500: Failed to retrieve API keys

### DELETE /api/api-keys/:keyId

Deletes a specific API key.

**Authentication**: Required (Bearer token)

**Response**:
```json
{
  "success": true
}
```

**Error Responses**:
- 401: Missing or invalid authorization
- 404: API key not found
- 500: Failed to delete API key

## Manual Testing Guide

### Prerequisites

1. Stripe test account (stripe.com)
2. Test API keys configured in `.env`:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRODUCT_PRICE_ID`
3. PostgreSQL database running
4. Backend server running on `http://localhost:3000`

### Test Scenario 1: Create Payment Link

```bash
# 1. Create a test user in database
psql -U user -d db -c "INSERT INTO users (email, name) VALUES ('test@example.com', 'Test User') RETURNING id;"

# 2. Create a conversation
psql -U user -d db -c "INSERT INTO conversations (user_id, title) VALUES (1, 'Test Conversation') RETURNING id;"

# 3. Request payment link
curl -X POST http://localhost:3000/api/payments/link \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": 1,
    "tier": "premium"
  }'

# Response should contain checkout URL
```

### Test Scenario 2: Handle Webhook with Test Event

```bash
# Generate a test webhook event using Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger test event
stripe trigger checkout.session.completed

# Verify in database:
# - orders table should have new record with status 'completed'
# - conversations table should have payment_status 'paid'
# - api_keys table should have new entry for user
```

### Test Scenario 3: Retrieve API Keys After Payment

```bash
# Use the generated API key from payment completion
curl -X GET http://localhost:3000/api/api-keys \
  -H "Authorization: Bearer sk_generated_key_from_payment"

# Response should show list of API keys (without exposing the full key)
```

### Test Scenario 4: Delete API Key

```bash
curl -X DELETE http://localhost:3000/api/api-keys/1 \
  -H "Authorization: Bearer sk_valid_api_key"

# Response should be {"success": true}
```

## Error Handling

### Webhook Signature Verification

The webhook handler verifies Stripe's signature to ensure the event is authentic. The verification uses:
- Request body (raw bytes)
- Stripe signature from header
- Webhook secret from environment

If verification fails, the request is rejected with a 400 error.

### Payment Status Transitions

```
unpaid -> pending -> paid (or failed)
   |
   +-> failed
```

### API Key Retrieval Restrictions

- API keys are ONLY accessible after successful payment
- The actual key is never returned after initial creation
- Only the prefix and metadata are exposed
- Each API key is uniquely identified by its hash

## Security Considerations

1. **API Key Storage**: Keys are stored as SHA256 hashes, never in plain text
2. **Key Format**: `sk_` prefix followed by 64 hexadecimal characters
3. **Webhook Verification**: All webhooks verified using Stripe signature
4. **Authentication**: API endpoint authentication via API key Bearer token
5. **Payment Verification**: Orders created only after webhook confirmation
6. **User Isolation**: Each user can only access their own API keys and payment status

## Configuration

Required environment variables in `.env`:

```
PORT=3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
STRIPE_PRODUCT_PRICE_ID=price_...
DATABASE_URL=postgresql://user:password@localhost/db
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret
```

## Troubleshooting

### Issue: Webhook not being received

1. Verify webhook URL is accessible from internet
2. Check webhook secret matches Stripe dashboard
3. Verify request signature header is present
4. Check server logs for errors

### Issue: API key not generated after payment

1. Verify `checkout.session.completed` event is being triggered
2. Check database connection is working
3. Verify user exists in users table
4. Check API key service logs for errors

### Issue: Cannot retrieve API keys

1. Verify API key authentication is valid
2. Check user has completed at least one payment
3. Verify user exists in orders table with status 'completed'
4. Check database has api_keys records for user

## Testing with Stripe Test Cards

Use these test cards during checkout:

- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Require Authentication**: 4000 0025 0000 3155

Expiry: Any future date
CVC: Any 3 digits

## Unit Tests

Run tests with:
```bash
npm test
```

Tests include:
- API key generation and hashing
- Webhook signature verification
- Mock webhook payload handling
- API key service operations

## Implementation Notes

1. The payment link is created per request, allowing for fresh Stripe sessions
2. API keys are generated automatically after payment to streamline user experience
3. The webhook handler uses raw body buffer to verify signatures correctly
4. All timestamps are stored in UTC
5. Stripe session metadata links payments to user and conversation
