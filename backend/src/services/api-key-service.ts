import crypto from 'crypto';
import { getDb } from '../db/index.js';

const API_KEY_PREFIX = 'sk_';
const API_KEY_LENGTH = 32;

export interface ApiKey {
  id: number;
  userId: number;
  keyHash: string;
  keyPrefix: string;
  name?: string;
  lastUsedAt?: Date;
  createdAt: Date;
}

export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(API_KEY_LENGTH);
  return API_KEY_PREFIX + randomBytes.toString('hex');
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function createApiKey(
  userId: number,
  name?: string
): Promise<{ key: string; apiKey: ApiKey }> {
  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  const keyPrefix = key.substring(0, 20);

  const sql = getDb();
  const result = await sql`
    INSERT INTO api_keys (user_id, key_hash, key_prefix, name)
    VALUES (${userId}, ${keyHash}, ${keyPrefix}, ${name || null})
    RETURNING id, user_id as "userId", key_hash as "keyHash", key_prefix as "keyPrefix", 
              name, last_used_at as "lastUsedAt", created_at as "createdAt"
  `;

  return {
    key,
    apiKey: result[0] as ApiKey,
  };
}

export async function getApiKeysByUser(userId: number): Promise<ApiKey[]> {
  const sql = getDb();
  const result = await sql`
    SELECT id, user_id as "userId", key_hash as "keyHash", key_prefix as "keyPrefix",
           name, last_used_at as "lastUsedAt", created_at as "createdAt"
    FROM api_keys
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;

  return result as ApiKey[];
}

export async function validateApiKey(key: string): Promise<number | null> {
  const keyHash = hashApiKey(key);
  const sql = getDb();

  const result = await sql`
    SELECT user_id
    FROM api_keys
    WHERE key_hash = ${keyHash}
  `;

  if (result.length === 0) {
    return null;
  }

  const userId = result[0].user_id;

  // Update last_used_at
  await sql`
    UPDATE api_keys
    SET last_used_at = CURRENT_TIMESTAMP
    WHERE key_hash = ${keyHash}
  `;

  return userId;
}

export async function deleteApiKey(keyId: number, userId: number): Promise<boolean> {
  const sql = getDb();
  const result = await sql`
    DELETE FROM api_keys
    WHERE id = ${keyId} AND user_id = ${userId}
  `;

  return result.count > 0;
}
