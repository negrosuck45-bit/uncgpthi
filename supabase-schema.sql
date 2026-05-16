-- ============================================
-- UNCGPT COMPLETE DATABASE SCHEMA
-- 30+ tables for all features
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- 1. CORE TABLES
-- ============================================

-- Users (managed by Supabase Auth, but we add profile data)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'premium')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  model TEXT DEFAULT 'llama-3.1-70b-versatile',
  provider TEXT DEFAULT 'groq',
  system_prompt TEXT,
  settings JSONB DEFAULT '{}',
  is_archived BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  model TEXT,
  provider TEXT,
  tokens_used INTEGER,
  tool_calls JSONB,
  tool_results JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. RAG / DOCUMENTS
-- ============================================

-- Documents (PDFs, text files)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  content_preview TEXT,
  chunk_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks with vector embeddings
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(384), -- all-MiniLM-L6-v2 produces 384-dim vectors
  chunk_index INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(384),
  match_threshold FLOAT,
  match_count INT,
  user_id_filter UUID
)
RETURNS TABLE(
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE document_chunks.user_id = user_id_filter
    AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- 3. CODE EXECUTION / TERMINAL
-- ============================================

-- Code executions history
CREATE TABLE IF NOT EXISTS public.code_executions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('python', 'javascript', 'bash')),
  code TEXT NOT NULL,
  output TEXT,
  error TEXT,
  execution_time_ms INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'error', 'timeout')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. ANALYTICS
-- ============================================

-- Usage stats
CREATE TABLE IF NOT EXISTS public.usage_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  requests_count INTEGER DEFAULT 0,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  models_used TEXT[],
  tools_used TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Model performance
CREATE TABLE IF NOT EXISTS public.model_performance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  avg_response_time_ms INTEGER,
  success_rate FLOAT,
  avg_tokens_per_request INTEGER,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. TOOLS / MCP CONNECTORS
-- ============================================

-- User tool configurations
CREATE TABLE IF NOT EXISTS public.user_tools (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tool_name)
);

-- Tool usage log
CREATE TABLE IF NOT EXISTS public.tool_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id),
  input_params JSONB,
  output_result TEXT,
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. CUSTOM INSTRUCTIONS / PROMPTS
-- ============================================

-- System prompts library
CREATE TABLE IF NOT EXISTS public.system_prompts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt templates
CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  variables TEXT[],
  category TEXT DEFAULT 'general',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. KNOWLEDGE BASE
-- ============================================

-- Knowledge base entries
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  tags TEXT[],
  embedding VECTOR(384),
  is_public BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. EXPORT / SHARING
-- ============================================

-- Chat exports
CREATE TABLE IF NOT EXISTS public.chat_exports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  format TEXT NOT NULL CHECK (format IN ('pdf', 'markdown', 'json', 'txt')),
  file_url TEXT,
  file_size INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared conversations
CREATE TABLE IF NOT EXISTS public.shared_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE NOT NULL,
  title TEXT,
  description TEXT,
  view_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. AGENTS / AUTOMATION
-- ============================================

-- AI agents
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  tools_enabled TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled tasks
CREATE TABLE IF NOT EXISTS public.scheduled_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  schedule TEXT NOT NULL, -- cron expression
  prompt TEXT NOT NULL,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task execution logs
CREATE TABLE IF NOT EXISTS public.task_executions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES public.scheduled_tasks(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'error')),
  output TEXT,
  error TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. MULTI-USER / TEAMS
-- ============================================

-- Teams
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Team conversations (shared)
CREATE TABLE IF NOT EXISTS public.team_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, conversation_id)
);

-- ============================================
-- 11. NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. SETTINGS & PREFERENCES
-- ============================================

-- User preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
  default_model TEXT DEFAULT 'llama-3.1-70b-versatile',
  default_provider TEXT DEFAULT 'groq',
  language TEXT DEFAULT 'en',
  auto_save BOOLEAN DEFAULT TRUE,
  show_timestamps BOOLEAN DEFAULT TRUE,
  code_theme TEXT DEFAULT 'dracula',
  font_size INTEGER DEFAULT 14,
  sidebar_collapsed BOOLEAN DEFAULT FALSE,
  shortcuts JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- 13. RATE LIMITING
-- ============================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, request_type, window_start)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user ON public.document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_code_executions_user ON public.code_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_date ON public.usage_stats(user_id, date);
CREATE INDEX IF NOT EXISTS idx_tool_usage_user ON public.tool_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_user ON public.knowledge_base(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON public.knowledge_base USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON public.document_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON public.conversations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.messages FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own chunks" ON public.document_chunks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create chunks" ON public.document_chunks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chunks" ON public.document_chunks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own code executions" ON public.code_executions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create code executions" ON public.code_executions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON public.usage_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tools" ON public.user_tools FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tools" ON public.user_tools FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tool usage" ON public.tool_usage FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own prompts" ON public.system_prompts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own prompts" ON public.system_prompts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own templates" ON public.prompt_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own templates" ON public.prompt_templates FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own knowledge" ON public.knowledge_base FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);
CREATE POLICY "Users can manage own knowledge" ON public.knowledge_base FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own exports" ON public.chat_exports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create exports" ON public.chat_exports FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own agents" ON public.agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own agents" ON public.agents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tasks" ON public.scheduled_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tasks" ON public.scheduled_tasks FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can create preferences" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_tools_updated_at BEFORE UPDATE ON public.user_tools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_prompts_updated_at BEFORE UPDATE ON public.system_prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prompt_templates_updated_at BEFORE UPDATE ON public.prompt_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON public.knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ language 'plpgsql' security definer;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
