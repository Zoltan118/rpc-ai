import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local first
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),
  
  // Supabase Configuration
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  
  // Claude API
  CLAUDE_API_KEY: z.string().min(1, 'CLAUDE_API_KEY is required'),
  
  // Stripe Configuration
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_PUBLIC_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL').optional(),
  
  // JWT Secret
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),
  
  // CORS Origins
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
}).transform((data) => {
  return {
    ...data,
    // Ensure STRIPE_PUBLISHABLE_KEY is populated if STRIPE_PUBLIC_KEY is provided
    STRIPE_PUBLISHABLE_KEY: data.STRIPE_PUBLISHABLE_KEY || data.STRIPE_PUBLIC_KEY,
  };
});

export type Env = z.infer<typeof envSchema>;

let envData: Env;

try {
  envData = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export const env = envData;
export default env;
