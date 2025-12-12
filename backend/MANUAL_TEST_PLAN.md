# Manual Testing Plan - Stripe Payment Flow

This document provides step-by-step manual testing procedures for the Stripe payment integration.

## Test Environment Setup

### 1. Stripe Account Configuration

1. Go to https://dashboard.stripe.com/
2. Switch to Test Mode (toggle in top right)
3. Navigate to Developers > API keys
4. Copy test keys to `.env`:
   - Secret Key → `STRIPE_SECRET_KEY`
   - Publishable Key → `STRIPE_PUBLISHABLE_KEY`

### 2. Webhook Configuration

1. In Stripe Dashboard, go to Developers > Webhooks
2. Click "Add endpoint"
3. Enter endpoint URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events to listen to:
   - checkout.session.completed
   - payment_intent.failed
5. Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET` in `.env`

### 3. Product and Price Setup

1. Go to Product Catalog > Products
2. Create or select a product
3. Add a price (e.g., $99.99)
4. Copy price ID → `STRIPE_PRODUCT_PRICE_ID` in `.env`

### 4. Database Setup

```bash
# Start PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE stripe_test;

# Connect to database
\c stripe_test

# Run schema
\i backend/src/db/schema.sql

# Verify tables created
\dt
```

### 5. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run build
npm run dev
```

Verify server is running:
```bash
curl http://localhost:3000/health
```

Expected response: `{"status":"ok"}`

## Test Cases

### Test Case 1: Create Payment Link

**Objective**: Verify payment link creation endpoint works correctly

**Prerequisites**:
- User exists in database with id=1 and email='test@example.com'
- Conversation exists with id=1 for user 1
- Valid API key exists for user 1

**Steps**:

1. Create test user:
```bash
psql -U postgres -d stripe_test -c \
  "INSERT INTO users (email, name) VALUES ('testuser@example.com', 'Test User') RETURNING id;"
```
Expected output: User ID (note this for later)

2. Create test conversation:
```bash
psql -U postgres -d stripe_test -c \
  "INSERT INTO conversations (user_id, title, payment_status) \
   VALUES (1, 'Test Chat', 'unpaid') RETURNING id;"
```
Expected output: Conversation ID 1

3. Create a test API key (manually insert for now):
```bash
psql -U postgres -d stripe_test << EOF
INSERT INTO api_keys (user_id, key_hash, key_prefix, name)
VALUES (1, 'test_hash_value', 'sk_test_0123456789', 'Test Key');
EOF
```

4. Request payment link:
```bash
curl -X POST http://localhost:3000/api/payments/link \
  -H "Authorization: Bearer sk_test_0123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": 1,
    "tier": "premium"
  }'
```

**Expected Response**:
```json
{
  "url": "https://checkout.stripe.com/pay/cs_test_...",
  "sessionId": "cs_test_..."
}
```

**Verification**:
- Response status: 200
- URL contains "checkout.stripe.com"
- SessionId is present
- Database conversation has stripe_session_id updated

### Test Case 2: Complete Payment Flow with Stripe Webhook

**Objective**: Verify complete payment flow including webhook handling

**Prerequisites**:
- Test Case 1 completed successfully
- Stripe CLI installed (`brew install stripe/stripe-cli/stripe` on macOS)

**Steps**:

1. Start webhook listener:
```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```
You'll see: `Ready! Your webhook signing secret is: whsec_...`
Copy this and update `.env` with `STRIPE_WEBHOOK_SECRET`

2. Open the payment link in a new terminal:
Copy the URL from Test Case 1 response and open in browser, or test directly:

3. Trigger test webhook event:
```bash
stripe trigger checkout.session.completed
```

**Expected Behavior**:
- Webhook received and processed (check server logs)
- No signature verification errors
- Database updated:

4. Verify database changes:
```bash
# Check orders table
psql -U postgres -d stripe_test -c \
  "SELECT * FROM orders WHERE user_id = 1 ORDER BY created_at DESC LIMIT 1;"
```

Expected: Row with status='completed'

```bash
# Check conversation payment status
psql -U postgres -d stripe_test -c \
  "SELECT id, payment_status FROM conversations WHERE id = 1;"
```

Expected: payment_status='paid'

```bash
# Check API keys created
psql -U postgres -d stripe_test -c \
  "SELECT id, key_prefix, name, created_at FROM api_keys WHERE user_id = 1 ORDER BY created_at DESC LIMIT 1;"
```

Expected: New API key record with auto-generated name

### Test Case 3: Retrieve API Keys After Payment

**Objective**: Verify API keys are only accessible after payment

**Prerequisites**:
- Test Case 2 completed successfully
- Have the generated API key from payment

**Steps**:

1. Get the new API key prefix from database:
```bash
psql -U postgres -d stripe_test -c \
  "SELECT key_prefix FROM api_keys WHERE user_id = 1 ORDER BY created_at DESC LIMIT 1;"
```

2. Test with the new API key (use the full generated key):
```bash
# First, get the actual key during payment completion in logs
# Or create a test key for this scenario
curl -X GET http://localhost:3000/api/api-keys \
  -H "Authorization: Bearer sk_test_generated_key"
```

**Expected Response**:
```json
{
  "keys": [
    {
      "id": 1,
      "prefix": "sk_test_0123456789abcdef01234",
      "name": "Auto-generated from payment",
      "createdAt": "2024-01-15T10:30:00Z",
      "lastUsedAt": "2024-01-15T11:45:00Z"
    }
  ]
}
```

**Verification**:
- Response status: 200
- Keys array is not empty
- Key prefix matches database
- lastUsedAt is updated (from the GET request)

### Test Case 4: API Keys Require Payment

**Objective**: Verify API keys endpoint returns error for unpaid users

**Prerequisites**:
- Create new user without payment
- Create test API key for unpaid user

**Steps**:

1. Create new user without payment:
```bash
psql -U postgres -d stripe_test -c \
  "INSERT INTO users (email, name) VALUES ('unpaid@example.com', 'Unpaid User') RETURNING id;"
```

2. Create test API key:
```bash
psql -U postgres -d stripe_test -c \
  "INSERT INTO api_keys (user_id, key_hash, key_prefix, name) \
   VALUES (2, 'unpaid_hash', 'sk_unpaid_test', 'Unpaid Key');"
```

3. Try to retrieve API keys:
```bash
curl -X GET http://localhost:3000/api/api-keys \
  -H "Authorization: Bearer sk_unpaid_test"
```

**Expected Response**:
```json
{
  "error": "API keys only available after payment"
}
```

**Verification**:
- Response status: 403
- Error message is present
- No keys are returned

### Test Case 5: Delete API Key

**Objective**: Verify API key deletion works correctly

**Prerequisites**:
- Test Case 3 completed (have paid user with API keys)

**Steps**:

1. Get API key ID:
```bash
psql -U postgres -d stripe_test -c \
  "SELECT id FROM api_keys WHERE user_id = 1 ORDER BY created_at DESC LIMIT 1;"
```

2. Delete the API key:
```bash
curl -X DELETE http://localhost:3000/api/api-keys/1 \
  -H "Authorization: Bearer sk_test_generated_key"
```

**Expected Response**:
```json
{
  "success": true
}
```

**Verification**:
- Response status: 200
- Key is deleted from database:
```bash
psql -U postgres -d stripe_test -c \
  "SELECT COUNT(*) FROM api_keys WHERE id = 1;"
```
Expected: 0

### Test Case 6: Failed Payment Handling

**Objective**: Verify webhook handles failed payments correctly

**Prerequisites**:
- Stripe CLI configured
- Backend running

**Steps**:

1. Start webhook listener:
```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

2. Trigger failed payment event:
```bash
stripe trigger payment_intent.failed
```

**Expected Behavior**:
- Webhook received (check logs: "Webhook error:" or handled gracefully)
- No database corruption
- Response: 200 OK

### Test Case 7: Invalid Webhook Signature

**Objective**: Verify invalid signatures are rejected

**Steps**:

1. Send webhook with invalid signature:
```bash
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "stripe-signature: t=123456789,v1=invalid_signature" \
  -H "Content-Type: application/json" \
  -d '{"type":"checkout.session.completed"}'
```

**Expected Response**:
```json
{
  "error": "Invalid signature"
}
```

**Verification**:
- Response status: 400
- No database changes
- Error is logged

### Test Case 8: Real Payment Simulation (Optional)

**Objective**: Test with real Stripe test payment

**Prerequisites**:
- Browser access to payment link
- Stripe test card

**Steps**:

1. Create payment link (Test Case 1)
2. Open URL in browser
3. Enter test card: `4242 4242 4242 4242`
4. Expiry: Any future date
5. CVC: Any 3 digits
6. Email: test@example.com
7. Click "Pay"

**Expected Behavior**:
- Payment succeeds
- Webhook triggered automatically
- Database updated
- API key generated
- Redirect to success URL

## Test Failure Troubleshooting

### Symptom: 401 Unauthorized on API endpoint

**Diagnosis**:
1. Check if API key exists in database: `SELECT * FROM api_keys WHERE key_prefix = 'sk_...'`
2. Verify Authorization header format: `Bearer sk_...`
3. Check user exists: `SELECT * FROM users WHERE id = ...`

### Symptom: Webhook not received

**Diagnosis**:
1. Check webhook listener is running
2. Verify webhook secret in .env matches Stripe CLI output
3. Check firewall/network allows webhook delivery
4. Check server logs for errors

### Symptom: Database errors

**Diagnosis**:
1. Verify database connection: `psql -U postgres -d stripe_test -c "SELECT 1;"`
2. Check schema created: `\dt` in psql
3. Verify user exists before operations
4. Check for foreign key constraint errors

### Symptom: Stripe API errors

**Diagnosis**:
1. Verify API keys in .env are correct
2. Check keys are test mode (start with sk_test_)
3. Verify product price exists: Go to Stripe Dashboard > Products
4. Check STRIPE_PRODUCT_PRICE_ID in .env

## Success Criteria

All tests pass when:
- ✅ Payment links created successfully
- ✅ Webhook signatures verified
- ✅ Orders created after payment
- ✅ API keys generated automatically
- ✅ API keys retrievable only after payment
- ✅ Invalid signatures rejected
- ✅ Failed payments handled gracefully
- ✅ API key deletion works
- ✅ Database schema supports all operations
- ✅ No sensitive data in logs

## Performance Metrics (Optional)

Track during testing:
- Payment link creation: < 500ms
- Webhook processing: < 200ms
- API key retrieval: < 100ms
- Database queries: < 50ms each

## Cleanup

After testing, clean up:

```bash
# Delete test data
psql -U postgres -d stripe_test << EOF
DELETE FROM api_keys;
DELETE FROM orders;
DELETE FROM conversations;
DELETE FROM users;
EOF

# Or drop entire database
dropdb stripe_test
```
