# Backend API

A Node.js + Express + TypeScript backend with Supabase authentication, featuring PostgreSQL migrations and comprehensive API structure.

## Features

- 🚀 **Express.js** server with TypeScript
- 🔐 **Supabase Authentication** with JWT validation
- 📊 **PostgreSQL** database with migrations
- 🔒 **Security** middleware (Helmet, CORS, rate limiting)
- 📝 **Environment** validation with Zod
- 🛠️ **Development** tools (nodemon, ESLint, Prettier)
- 🏥 **Health** checks and monitoring
- ⚡ **Graceful** shutdown handling

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database (via Supabase or local)
- Supabase project
- Stripe account (for payments)
- Claude API key (for AI features)

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
# or
pnpm install
```

### 2. Environment Setup

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Claude API
CLAUDE_API_KEY=your_claude_api_key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=postgresql://...

# JWT Secret
JWT_SECRET=your_jwt_secret_key_minimum_32_characters
```

### 3. Database Setup & Migrations

#### Option A: Using Supabase (Recommended)

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Enable the SQL Editor** in your project
3. **Run the migration** by copying the contents of `db/migrations/001_init.sql` and executing it in the Supabase SQL Editor
4. **Verify the tables** were created in the Table Editor

#### Option B: Using Local PostgreSQL

If you have a local PostgreSQL database:

```bash
# Using psql directly
psql -d your_database -f db/migrations/001_init.sql

# Or using a migration tool like node-pg-migrate
npm install -g node-pg-migrate
node-pg-migrate up --env development
```

#### Option C: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Initialize Supabase in your project (if not already done)
supabase init

# Link to your remote project
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push
```

### 4. Start Development Server

```bash
npm run dev
# or
pnpm dev
```

The server will start on `http://localhost:3000`

### 5. Verify Installation

Visit these endpoints to verify everything is working:

- **Health Check**: http://localhost:3000/health
- **API Status**: http://localhost:3000/api/v1/status
- **Protected Route**: http://localhost:3000/api/v1/protected (requires auth token)

## API Documentation

### Authentication

This backend uses **Supabase JWT tokens** for authentication. Include the token in the Authorization header:

```javascript
const response = await fetch('/api/v1/protected', {
  headers: {
    'Authorization': 'Bearer ' + supabaseToken,
    'Content-Type': 'application/json'
  }
});
```

### Available Routes

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/health` | No | Health check |
| GET | `/health/ready` | No | Readiness probe |
| GET | `/health/live` | No | Liveness probe |
| GET | `/api/v1/status` | No | API status |
| GET | `/api/v1/protected` | Yes | Protected example route |
| GET | `/api/v1/optional-auth` | No | Optional auth example |

### Supabase Auth Middleware

#### Basic Authentication Middleware

Use `authenticateUser` to protect routes that require authentication:

```typescript
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { Router } from 'express';

const router = Router();

router.get('/protected-route', authenticateUser, (req: AuthenticatedRequest, res) => {
  // req.user contains the authenticated user's information
  const userId = req.user?.id;
  const userEmail = req.user?.email;
  
  res.json({
    message: 'Access granted',
    user: req.user
  });
});
```

#### Optional Authentication Middleware

Use `optionalAuthenticate` for routes that work with or without authentication:

```typescript
import { optionalAuthenticate, AuthenticatedRequest } from '../middleware/auth';
import { Router } from 'express';

const router = Router();

router.get('/flexible-route', optionalAuthenticate, (req: AuthenticatedRequest, res) => {
  if (req.user) {
    // User is authenticated
    res.json({
      message: 'Welcome back!',
      user: req.user
    });
  } else {
    // User is anonymous
    res.json({
      message: 'Hello, anonymous user!'
    });
  }
});
```

#### AuthenticatedRequest Interface

The `AuthenticatedRequest` interface extends Express's `Request` and includes:

```typescript
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
  };
}
```

### Error Handling

The API uses a consistent error response format:

```typescript
{
  "error": "Error message",
  "message": "Detailed error description", // Only in development
  "stack": "Error stack trace"             // Only in development
}
```

### CORS Configuration

CORS is configured to allow requests from:
- `http://localhost:3000`
- `http://localhost:5173`

Update the `CORS_ORIGINS` environment variable for additional origins.

## Database Schema

The initial migration creates the following tables:

### Users Table
- Extends Supabase `auth.users`
- Includes subscription and billing information
- Links to Stripe customer data

### Conversations Table
- Stores conversation sessions
- Links to users and messages
- Includes AI model configuration

### Messages Table
- Stores individual messages in conversations
- Supports different roles (user, assistant, system)
- Tracks token usage and metadata

### API Keys Table
- Manages user-generated API keys
- Stores hashed keys for security
- Supports expiration and usage tracking

### Pricing Configuration Table
- Defines subscription tiers
- Stores pricing and feature information
- Configurable limits and restrictions

## Development

### Scripts

```bash
npm run dev          # Start development server with nodemon
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run clean        # Remove build directory
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
```

### Code Style

This project uses:
- **ESLint** for TypeScript linting
- **Prettier** for code formatting
- **Strict TypeScript** configuration

### Adding New Routes

1. Create route files in `src/routes/`
2. Import and use auth middleware as needed
3. Add routes to `src/index.ts`

Example route file:

```typescript
// src/routes/example.ts
import { Router } from 'express';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.get('/example', authenticateUser, (req: AuthenticatedRequest, res) => {
  res.json({
    message: 'Example route',
    user: req.user
  });
});

export default router;
```

## Production Deployment

### Environment Variables

Set these environment variables in production:

```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_supabase_service_key
# ... other production values
```

### Build and Deploy

```bash
npm run build
npm start
```

### Docker Support (Optional)

Create a `Dockerfile` for containerized deployment:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify `DATABASE_URL` is correct
   - Check Supabase project status
   - Ensure IP allowlist includes your server

2. **Authentication Failures**
   - Verify Supabase JWT token format
   - Check token expiration
   - Ensure Supabase keys are correct

3. **CORS Errors**
   - Update `CORS_ORIGINS` environment variable
   - Check request headers and methods

4. **Environment Validation Errors**
   - Ensure all required environment variables are set
   - Check `.env` file format and values

### Getting Help

- Check the server logs for detailed error messages
- Verify environment variables using the health check endpoint
- Test authentication with the example routes

## License

This project is part of a larger application. See the main repository for licensing information.