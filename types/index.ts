export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  model?: string;
  provider?: string;
  toolCalls?: any[];
  timestamp: string;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
  icon: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
}
