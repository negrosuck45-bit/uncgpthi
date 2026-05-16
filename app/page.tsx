"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send, Bot, User, Loader2, Terminal, FileText, Settings,
  Trash2, Copy, CheckCircle, Paperclip, X,
  Plus, MessageSquare, History, Zap, ChevronDown,
  Sparkles, Database
} from "lucide-react";
import TerminalOutput, { CodeInput } from "@/components/terminal-output";

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  model?: string;
  provider?: string;
  toolCalls?: any[];
  timestamp: string;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  description: string;
  icon: string;
}

const MODELS: ModelOption[] = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "groq", description: "Best overall", icon: "🦙" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", provider: "groq", description: "Fast", icon: "⚡" },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout", provider: "groq", description: "Vision", icon: "👁" },
  { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1", provider: "groq", description: "Reasoning", icon: "🧠" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", provider: "groq", description: "Coding", icon: "💻" },
  { id: "@cf/anthropic/claude-3-haiku", name: "Claude Haiku", provider: "cloudflare", description: "Fast Claude", icon: "🎯" },
  { id: "@cf/qwen/qwen2.5-coder-32b-instruct", name: "Qwen Coder", provider: "cloudflare", description: "Code expert", icon: "🔷" },
  { id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", name: "DeepSeek CF", provider: "cloudflare", description: "Reasoning", icon: "🌊" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [terminalStatus, setTerminalStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [terminalLanguage, setTerminalLanguage] = useState("python");
  const [showRAGPanel, setShowRAGPanel] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = inputRef.current.scrollHeight + "px";
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          model: selectedModel.id,
          provider: selectedModel.provider,
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        model: selectedModel.name,
        provider: selectedModel.provider,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages(prev =>
                  prev.map(m => m.id === assistantMessage.id
                    ? { ...m, content: fullContent }
                    : m
                  )
                );
              }
              if (parsed.tool_step) {
                console.log("Tool step:", parsed.tool_step);
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: `Error: ${error.message || "Something went wrong"}`,
        timestamp: new Date().toLocaleTimeString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (content: string, messageId: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", "anonymous");

      const res = await fetch("/api/rag/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: "system",
            content: `📄 Uploaded **${file.name}** (${data.chunks} chunks indexed). Ask me about it!`,
            timestamp: new Date().toLocaleTimeString(),
          }]);
        }
      }
    } catch (e) {
      console.error("Upload failed");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCodeExecute = async (code: string, language: string) => {
    setTerminalStatus("running");
    setTerminalLanguage(language);
    setTerminalOutput("");
    setShowTerminal(true);

    try {
      const res = await fetch("/api/execute-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      const data = await res.json();
      const output = data.output || "";
      const error = data.error || "";
      const fullOutput = output + (error ? `\n\n[ERROR]\n${error}` : "");

      setTerminalOutput(fullOutput);
      setTerminalStatus(data.success ? "success" : "error");

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: `Executed **${language}** (${data.executionTime}ms):\n\`\`\`${language}\n${code}\n\`\`\`\n\n**Output:**\n\`\`\`\n${fullOutput}\n\`\`\``,
        timestamp: new Date().toLocaleTimeString(),
      }]);
    } catch (e: any) {
      setTerminalOutput(`Failed: ${e.message}`);
      setTerminalStatus("error");
    }
  };

  const renderMessageContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("```")) return null;
      if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
      if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold mt-3 mb-2">{line.slice(3)}</h2>;
      if (line.startsWith("- ")) return <li key={i} className="ml-4 text-gray-300">{line.slice(2)}</li>;
      if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold text-white">{line.slice(2, -2)}</p>;
      if (line.includes("`")) {
        const parts = line.split(/(`[^`]+`)/);
        return (
          <p key={i} className="text-gray-300">
            {parts.map((part, j) =>
              part.startsWith("`") && part.endsWith("`")
                ? <code key={j} className="bg-gray-800 px-1.5 py-0.5 rounded text-sm text-green-400 font-mono">{part.slice(1, -1)}</code>
                : part
            )}
          </p>
        );
      }
      return <p key={i} className="text-gray-300">{line}</p>;
    }).filter(Boolean);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-64" : "w-0"} transition-all duration-300 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-blue-400" />
            <span className="font-bold text-lg">UNC-GPT</span>
          </div>
          <button
            onClick={() => { setMessages([]); setInput(""); }}
            className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs text-gray-500 uppercase font-semibold mb-2 px-2">History</div>
          {conversations.map((conv) => (
            <button
              key={conv.id}
              className="w-full text-left px-3 py-2 rounded-lg text-sm mb-1 text-gray-400 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span className="truncate">{conv.title || "Untitled"}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Bot className="w-4 h-4" />
            <span>v2.0 Complete</span>
          </div>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <History className="w-5 h-5" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
              >
                <span>{selectedModel.icon}</span>
                <span>{selectedModel.name}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showModelDropdown && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => { setSelectedModel(model); setShowModelDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        selectedModel.id === model.id ? "bg-blue-600/20 text-blue-400" : "text-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{model.icon}</span>
                        <div>
                          <div className="font-medium text-sm">{model.name}</div>
                          <div className="text-xs text-gray-500">{model.description} • {model.provider}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                showTerminal ? "bg-yellow-600/20 text-yellow-400 border border-yellow-600/30" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <Terminal className="w-4 h-4" />
              Code
            </button>
            <button
              onClick={() => { setShowRAGPanel(!showRAGPanel); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                showRAGPanel ? "bg-blue-600/20 text-blue-400 border border-blue-600/30" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <Database className="w-4 h-4" />
              Docs
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Bot className="w-16 h-16 mb-4 text-gray-700" />
              <h2 className="text-2xl font-bold mb-2">UNC-GPT Complete</h2>
              <p className="text-center max-w-md mb-6">
                AI chat with <span className="text-blue-400">tools</span>,
                <span className="text-green-400"> RAG</span>,
                <span className="text-yellow-400"> code execution</span>, and
                <span className="text-purple-400"> MCP connectors</span>.
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-md w-full">
                {["List my GitHub repos", "Search the web for AI news", "Run Python: print('Hello')", "Upload a PDF and ask about it"].map((example) => (
                  <button
                    key={example}
                    onClick={() => setInput(example)}
                    className="text-left px-3 py-2 bg-gray-800/50 hover:bg-gray-800 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role !== "user" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}

              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : message.role === "system"
                  ? "bg-gray-800/50 border border-gray-700 text-gray-400 text-sm"
                  : "bg-gray-800 text-gray-100"
              }`}>
                <div className="text-sm leading-relaxed">
                  {renderMessageContent(message.content)}
                </div>

                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.toolCalls.map((tool: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-gray-900/50 rounded px-2 py-1">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span className="text-yellow-400">{tool.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">{message.timestamp}</span>
                  {message.model && <span className="text-xs text-gray-600">{message.model}</span>}
                  {message.role === "assistant" && (
                    <button
                      onClick={() => handleCopy(message.content, message.id)}
                      className="p-1 hover:bg-gray-700 rounded transition-colors"
                    >
                      {copiedMessageId === message.id ? (
                        <CheckCircle className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-gray-500" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-gray-300" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gray-800 rounded-2xl px-4 py-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Terminal Panel */}
        {showTerminal && (
          <div className="border-t border-gray-800 bg-gray-950">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
              <span className="text-sm font-medium text-gray-300">Code Terminal</span>
              <button onClick={() => setShowTerminal(false)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <CodeInput onExecute={handleCodeExecute} />
              {terminalOutput && (
                <div className="mt-4">
                  <TerminalOutput
                    output={terminalOutput}
                    language={terminalLanguage}
                    status={terminalStatus}
                    onClear={() => { setTerminalOutput(""); setTerminalStatus("idle"); }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* RAG Panel */}
        {showRAGPanel && (
          <div className="border-t border-gray-800 bg-gray-950">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
              <span className="text-sm font-medium text-gray-300">Document Manager</span>
              <button onClick={() => setShowRAGPanel(false)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.txt,.md,.doc,.docx"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                  {uploadingFile ? "Uploading..." : "Upload Document"}
                </button>
                <span className="text-xs text-gray-500">PDF, TXT, MD (max 10MB)</span>
              </div>

              {documents.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-400 font-medium">Uploaded Documents</div>
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <span className="text-sm">{doc.filename}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          doc.status === "ready" ? "bg-green-900/30 text-green-400" : "bg-yellow-900/30 text-yellow-400"
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                      <button className="p-1 hover:bg-red-900/30 rounded text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-800 p-4 bg-gray-900/50">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end gap-2 bg-gray-800 rounded-xl p-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Upload file"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message UNC-GPT... (Shift+Enter for new line)"
                className="flex-1 bg-transparent text-white placeholder-gray-500 resize-none max-h-32 py-2 px-2 focus:outline-none"
                rows={1}
              />

              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-white transition-colors"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-600">
              <span>Press Enter to send</span>
              <span>•</span>
              <span>Shift+Enter for new line</span>
              <span>•</span>
              <span className="text-purple-400">Tools auto-enabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
