process.env.NODE_ENV = 'test';
process.env.PORT = '3001';

process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

process.env.CLAUDE_API_KEY = 'test-claude-key';

process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

process.env.DATABASE_URL = 'http://localhost:54321/postgres';
process.env.JWT_SECRET = '12345678901234567890123456789012';

process.env.CORS_ORIGINS = 'http://localhost:3000';
