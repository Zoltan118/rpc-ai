import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const isTruthy = (value: string | undefined): boolean => {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const DEBUG_ENV = isTruthy(process.env.DEBUG_ENV);

const backendRoot = path.resolve(__dirname, '..', '..');
const repoRoot = path.resolve(backendRoot, '..');

const loadEnvFile = (filePath: string): { loaded: boolean; error?: string } => {
  if (!fs.existsSync(filePath)) {
    return { loaded: false };
  }

  const result = dotenv.config({ path: filePath, override: false });
  if (result.error) {
    return { loaded: false, error: result.error.message };
  }

  return { loaded: true };
};

const unique = <T,>(items: T[]): T[] => Array.from(new Set(items));

const candidateEnvFiles = unique(
  [
    process.env.ENV_FILE ? path.resolve(process.cwd(), process.env.ENV_FILE) : undefined,

    path.resolve(backendRoot, '.env.local'),
    path.resolve(backendRoot, '.env'),

    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),

    path.resolve(repoRoot, '.env.local'),
    path.resolve(repoRoot, '.env'),
  ].filter((v): v is string => Boolean(v))
);

const loadedEnvFiles: Array<{ filePath: string; error?: string }> = [];
for (const filePath of candidateEnvFiles) {
  const { loaded, error } = loadEnvFile(filePath);
  if (!loaded && !error) {
    continue;
  }

  loadedEnvFiles.push(error ? { filePath, error } : { filePath });
}

const envSchema = z.object({
  NODE_ENV: z
    .preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.enum(['development', 'test', 'production']))
    .default('development'),
  PORT: z
    .preprocess((v) => {
      if (typeof v === 'string' && v.trim() === '') return undefined;
      return v;
    }, z.coerce.number().int().min(1).max(65535))
    .default(3000),

  SUPABASE_URL: z
    .string()
    .trim()
    .min(1, { message: 'SUPABASE_URL is required' })
    .url({ message: 'SUPABASE_URL must be a valid URL' }),
  SUPABASE_ANON_KEY: z.string().trim().min(1, { message: 'SUPABASE_ANON_KEY is required' }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1, { message: 'SUPABASE_SERVICE_ROLE_KEY is required' }),

  CLAUDE_API_KEY: z.string().trim().min(1, { message: 'CLAUDE_API_KEY is required' }),

  STRIPE_SECRET_KEY: z.string().trim().min(1, { message: 'STRIPE_SECRET_KEY is required' }),
  STRIPE_PUBLISHABLE_KEY: z
    .preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().min(1))
    .optional(),
  STRIPE_PUBLIC_KEY: z
    .preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().min(1))
    .optional(),
  STRIPE_WEBHOOK_SECRET: z
    .preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().min(1))
    .optional(),

  DATABASE_URL: z
    .preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().url())
    .optional(),

  JWT_SECRET: z
    .preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().min(32))
    .optional(),

  CORS_ORIGINS: z
    .preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string())
    .default('http://localhost:3000,http://localhost:5173'),
});

export type Env = z.infer<typeof envSchema>;

const redact = (value: string | undefined): string => {
  if (!value) return '[unset]';
  return `[set len=${value.length}]`;
};

const envDebugSnapshot = () => {
  return {
    cwd: process.cwd(),
    backendRoot,
    repoRoot,
    loadedEnvFiles,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: redact(process.env.SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: redact(process.env.SUPABASE_SERVICE_ROLE_KEY),
      CLAUDE_API_KEY: redact(process.env.CLAUDE_API_KEY),
      STRIPE_SECRET_KEY: redact(process.env.STRIPE_SECRET_KEY),
      STRIPE_PUBLISHABLE_KEY: redact(process.env.STRIPE_PUBLISHABLE_KEY),
      STRIPE_PUBLIC_KEY: redact(process.env.STRIPE_PUBLIC_KEY),
      STRIPE_WEBHOOK_SECRET: redact(process.env.STRIPE_WEBHOOK_SECRET),
      DATABASE_URL: redact(process.env.DATABASE_URL),
      JWT_SECRET: redact(process.env.JWT_SECRET),
      CORS_ORIGINS: process.env.CORS_ORIGINS,
    },
  };
};

if (DEBUG_ENV) {
  console.log('🔧 ENV DEBUG SNAPSHOT (before Zod parse)');
  console.log(JSON.stringify(envDebugSnapshot(), null, 2));
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');

  if (loadedEnvFiles.length === 0) {
    console.error(
      `No .env files were loaded. Looked in:\n${candidateEnvFiles.map((p) => `  - ${p}`).join('\n')}`
    );
  } else {
    console.error(
      `dotenv load results:\n${loadedEnvFiles
        .map((f) => `  - ${f.filePath}${f.error ? ` (error: ${f.error})` : ''}`)
        .join('\n')}`
    );
  }

  parsed.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });

  process.exit(1);
}

const envData: Env = parsed.data;

export const env: Env = {
  ...envData,
  STRIPE_PUBLISHABLE_KEY: envData.STRIPE_PUBLISHABLE_KEY ?? envData.STRIPE_PUBLIC_KEY,
};

export default env;
