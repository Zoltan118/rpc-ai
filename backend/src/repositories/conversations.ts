import type { Conversation, Message } from '../types';
import { supabaseAdmin } from '../utils/supabase';

export const ensureUserRow = async (params: { userId: string; email?: string }): Promise<void> => {
  const { data, error } = await supabaseAdmin.from('users').select('id').eq('id', params.userId).maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return;
  }

  if (!params.email) {
    throw new Error('User email is required to create user row');
  }

  const { error: insertError } = await supabaseAdmin.from('users').insert({
    id: params.userId,
    email: params.email,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (insertError) {
    throw insertError;
  }
};

export const createConversation = async (params: {
  userId: string;
  title?: string;
  model?: string;
  system_prompt?: string;
}): Promise<Conversation> => {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .insert({
      user_id: params.userId,
      title: params.title ?? 'New Conversation',
      model: params.model ?? 'claude-3-sonnet-20240229',
      system_prompt: params.system_prompt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as Conversation;
};

export const getConversationById = async (params: {
  conversationId: string;
  userId: string;
}): Promise<Conversation | null> => {
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('*')
    .eq('id', params.conversationId)
    .eq('user_id', params.userId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as Conversation) || null;
};

export const listRecentMessages = async (params: {
  conversationId: string;
  limit: number;
}): Promise<Message[]> => {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('conversation_id', params.conversationId)
    .order('created_at', { ascending: true })
    .limit(params.limit);

  if (error) {
    throw error;
  }

  return (data as Message[]) || [];
};

export const insertMessage = async (params: {
  conversationId: string;
  userId: string;
  role: Message['role'];
  content: string;
  model?: string;
  tokens_used?: number;
  metadata?: Record<string, unknown>;
}): Promise<Message> => {
  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: params.conversationId,
      user_id: params.userId,
      role: params.role,
      content: params.content,
      model: params.model,
      tokens_used: params.tokens_used ?? 0,
      metadata: params.metadata ?? {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as Message;
};
