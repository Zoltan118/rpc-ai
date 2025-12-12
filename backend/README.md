# Backend API

Node.js/Express backend with Stripe payment integration.

## Quick Start

### Install Dependencies

```bash
npm install
```

### Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### Database Setup

Create PostgreSQL database and run schema:

```bash
psql -U user -d db -f src/db/schema.sql
```

### Development

```bash
npm run dev
```

Server will run on `http://localhost:3000`

### Build for Production

```bash
npm run build
npm start
```

## API Endpoints

### Payments
- `POST /api/payments/link` - Create Stripe payment link (requires auth)

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler

### API Keys
- `GET /api/api-keys` - Get user's API keys (requires auth)
- `DELETE /api/api-keys/:keyId` - Delete API key (requires auth)

## Testing

```bash
npm test
```

## Documentation

See [PAYMENT_FLOW.md](./PAYMENT_FLOW.md) for complete payment flow documentation and manual testing guide.

## Architecture

- **Routes**: Express route handlers in `src/routes/`
- **Services**: Business logic in `src/services/`
- **Middleware**: Authentication and webhook handling in `src/middleware/`
- **Database**: PostgreSQL schema in `src/db/`
- **Tests**: Unit tests in `src/**/__tests__/`

## Environment Variables

See `.env.example` for all required variables.

## Security

- API keys are hashed using SHA256
- Stripe webhooks verified using signature
- Authentication via Bearer token with API keys
- All sensitive data is stored securely in database
