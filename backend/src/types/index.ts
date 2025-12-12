// Database types based on the schema
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  subscription_status: 'free' | 'pro' | 'team' | 'enterprise';
  subscription_tier: string;
  total_credits: number;
  used_credits: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  model: string;
  system_prompt?: string;
  is_archived: boolean;
  is_deleted: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  updated_at: string;
  tokens_used: number;
  model?: string;
  metadata: Record<string, any>;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
  expires_at?: string;
}

export interface PricingConfig {
  id: string;
  tier_name: string;
  display_name: string;
  description?: string;
  price_monthly_cents: number;
  price_yearly_cents?: number;
  features: string[];
  limits: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Request types
export interface CreateConversationRequest {
  title?: string;
  model?: string;
  system_prompt?: string;
}

export interface CreateMessageRequest {
  content: string;
  role: 'user' | 'assistant' | 'system';
  model?: string;
}

export interface UpdateConversationRequest {
  title?: string;
  system_prompt?: string;
  is_archived?: boolean;
}

export interface CreateApiKeyRequest {
  name: string;
  expires_in_days?: number;
}

// Environment types
export interface EnvConfig {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;

  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  CLAUDE_API_KEY: string;

  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_PUBLIC_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;

  DATABASE_URL?: string;
  JWT_SECRET?: string;

  CORS_ORIGINS: string;
}

// Error types
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found') {
    super(message, 404);
  }
}