import { describe, it, expect } from 'vitest';
import { generateApiKey, hashApiKey } from '../api-key-service.js';

describe('API Key Service', () => {
  describe('generateApiKey', () => {
    it('should generate a key with the correct prefix', () => {
      const key = generateApiKey();
      expect(key).toMatch(/^sk_[a-f0-9]{64}$/);
    });

    it('should generate unique keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });

    it('should have correct length', () => {
      const key = generateApiKey();
      expect(key.length).toBe(67); // 'sk_' (3) + 64 hex chars
    });
  });

  describe('hashApiKey', () => {
    it('should produce consistent hash', () => {
      const key = 'sk_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      const hash1 = hashApiKey(key1);
      const hash2 = hashApiKey(key2);
      expect(hash1).not.toBe(hash2);
    });

    it('should produce SHA256 hash', () => {
      const key = 'sk_test_key';
      const hash = hashApiKey(key);
      expect(hash.length).toBe(64); // SHA256 hex is 64 chars
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
