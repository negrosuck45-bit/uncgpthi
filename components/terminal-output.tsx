"use client";

import React, { useState, useRef, useEffect } from "react";
import { Copy, Download, Trash2, Terminal, Play, CheckCircle, XCircle, Clock } from "lucide-react";

interface TerminalOutputProps {
  output: string;
  language: string;
  status: "running" | "success" | "error" | "idle";
  executionTime?: number;
  timestamp?: string;
  onClear?: () => void;
}

const SYNTAX_COLORS: Record<string, Record<string, string>> = {
  python: {
    keyword: "#ff79c6",
    string: "#f1fa8c",
    comment: "#6272a4",
    function: "#50fa7b",
    number: "#bd93f9",
    class: "#8be9fd",
    operator: "#ff79c6",
    default: "#f8f8f2",
  },
  javascript: {
    keyword: "#c678dd",
    string: "#98c379",
    comment: "#5c6370",
    function: "#61afef",
    number: "#d19a66",
    class: "#e5c07b",
    operator: "#c678dd",
    default: "#abb2bf",
  },
  bash: {
    keyword: "#ff6b6b",
    string: "#feca57",
    comment: "#8395a7",
    function: "#48dbfb",
    number: "#ff9ff3",
    class: "#54a0ff",
    operator: "#ff6b6b",
    default: "#dfe6e9",
  },
};

const KEYWORDS: Record<string, string[]> = {
  python: [
    "def", "class", "import", "from", "return", "if", "else", "elif", "for", "while",
    "try", "except", "finally", "with", "as", "lambda", "yield", "async", "await",
    "print", "len", "range", "list", "dict", "set", "tuple", "str", "int", "float",
    "bool", "None", "True", "False", "and", "or", "not", "in", "is", "pass", "break",
    "continue", "raise", "assert", "del", "global", "nonlocal",
  ],
  javascript: [
    "const", "let", "var", "function", "class", "extends", "import", "export", "default",
    "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue",
    "try", "catch", "finally", "throw", "new", "this", "typeof", "instanceof", "void",
    "delete", "in", "of", "await", "async", "yield", "debugger", "true", "false",
    "null", "undefined", "NaN", "Infinity",
  ],
  bash: [
    "if", "then", "else", "elif", "fi", "for", "while", "do", "done", "case", "esac",
    "function", "return", "exit", "echo", "printf", "read", "source", "export", "unset",
    "local", "declare", "typeset", "readonly", "shift", "break", "continue", "test",
    "true", "false",
  ],
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightCode(code: string, language: string): string {
  const colors = SYNTAX_COLORS[language] || SYNTAX_COLORS.bash;
  const keywords = KEYWORDS[language] || [];

  let highlighted = escapeHtml(code);

  // Comments
  if (language === "python") {
    highlighted = highlighted.replace(
      /(#.*$)/gm,
      `<span style="color:${colors.comment}">$1</span>`
    );
  } else if (language === "javascript") {
    highlighted = highlighted.replace(
      /(\/\/.*$)/gm,
      `<span style="color:${colors.comment}">$1</span>`
    );
    highlighted = highlighted.replace(
      /(\/\*[\s\S]*?\*\/)/g,
      `<span style="color:${colors.comment}">$1</span>`
    );
  } else if (language === "bash") {
    highlighted = highlighted.replace(
      /(#.*$)/gm,
      `<span style="color:${colors.comment}">$1</span>`
    );
  }

  // Double-quoted strings - using string constructor to avoid escape issues
  const dqRegex = new RegExp('("(?:[^"\\]|\\.)*")', 'g');
  highlighted = highlighted.replace(
    dqRegex,
    `<span style="color:${colors.string}">$1</span>`
  );

  // Single-quoted strings
  const sqRegex = new RegExp("('(?:[^'\\]|\\.)*')", 'g');
  highlighted = highlighted.replace(
    sqRegex,
    `<span style="color:${colors.string}">$1</span>`
  );

  // Python triple-quoted strings
  if (language === "python") {
    const tqRegex = new RegExp('("""[\s\S]*?""")', 'g');
    highlighted = highlighted.replace(
      tqRegex,
      `<span style="color:${colors.string}">$1</span>`
    );
  }

  // Numbers
  highlighted = highlighted.replace(
    /(\d+\.?\d*)/g,
    `<span style="color:${colors.number}">$1</span>`
  );

  // Keywords
  for (const kw of keywords) {
    const regex = new RegExp(`\b(${kw})\b`, "g");
    highlighted = highlighted.replace(
      regex,
      `<span style="color:${colors.keyword}">$1</span>`
    );
  }

  // Functions (word before parens)
  highlighted = highlighted.replace(
    /(\w+)(?=\()/g,
    `<span style="color:${colors.function}">$1</span>`
  );

  return highlighted;
}

function formatOutput(output: string, language: string): React.ReactNode {
  const lines = output.split("
");

  return lines.map((line, i) => {
    if (line.includes("Error") || line.includes("ERROR") || line.includes("Traceback") || line.includes("exception")) {
      return (
        <div key={i} className="text-red-400 font-mono text-sm py-0.5 px-2 hover:bg-red-950/30 rounded">
          <span className="text-red-500 mr-2">✗</span>
          <span dangerouslySetInnerHTML={{ __html: highlightCode(line, language) }} />
        </div>
      );
    }
    if (line.includes("Warning") || line.includes("WARN")) {
      return (
        <div key={i} className="text-yellow-400 font-mono text-sm py-0.5 px-2 hover:bg-yellow-950/30 rounded">
          <span className="text-yellow-500 mr-2">⚠</span>
          <span dangerouslySetInnerHTML={{ __html: highlightCode(line, language) }} />
        </div>
      );
    }
    if (line.includes("Success") || line.includes("success") || line.includes("Done") || line.includes("complete")) {
      return (
        <div key={i} className="text-green-400 font-mono text-sm py-0.5 px-2 hover:bg-green-950/30 rounded">
          <span className="text-green-500 mr-2">✓</span>
          <span dangerouslySetInnerHTML={{ __html: highlightCode(line, language) }} />
        </div>
      );
    }
    if (line.includes("INFO") || line.includes("[INFO]")) {
      return (
        <div key={i} className="text-cyan-400 font-mono text-sm py-0.5 px-2 hover:bg-cyan-950/30 rounded">
          <span className="text-cyan-500 mr-2">ℹ</span>
          <span dangerouslySetInnerHTML={{ __html: highlightCode(line, language) }} />
        </div>
      );
    }
    if (line.startsWith("$") || line.startsWith(">") || line.startsWith("#")) {
      return (
        <div key={i} className="text-green-300 font-mono text-sm py-0.5 px-2">
          <span className="text-green-500 mr-2 font-bold">$</span>
          <span dangerouslySetInnerHTML={{ __html: highlightCode(line.slice(1).trim(), language) }} />
        </div>
      );
    }
    return (
      <div key={i} className="text-gray-300 font-mono text-sm py-0.5 px-2 hover:bg-gray-800/50 rounded">
        <span dangerouslySetInnerHTML={{ __html: highlightCode(line, language) }} />
      </div>
    );
  });
}

export default function TerminalOutput({
  output,
  language,
  status,
  executionTime,
  timestamp = new Date().toLocaleTimeString(),
  onClear,
}: TerminalOutputProps) {
  const [copied, setCopied] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `output-${language}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  const statusConfig = {
    idle: { color: "text-gray-400", bg: "bg-gray-900", icon: Terminal },
    running: { color: "text-yellow-400", bg: "bg-yellow-950/20", icon: Play },
    success: { color: "text-green-400", bg: "bg-green-950/20", icon: CheckCircle },
    error: { color: "text-red-400", bg: "bg-red-950/20", icon: XCircle },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-700 bg-gray-950 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-4 h-4 ${config.color}`} />
            <span className="text-sm font-semibold text-gray-300">
              {language.toUpperCase()} Terminal
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color} border border-gray-700`}>
              {status.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {executionTime && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {executionTime}ms
            </span>
          )}
          <span className="text-xs text-gray-600">{timestamp}</span>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Copy output"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Download output"
          >
            <Download className="w-4 h-4" />
          </button>
          {onClear && (
            <button
              onClick={onClear}
              className="p-1.5 rounded hover:bg-red-900/50 text-gray-400 hover:text-red-400 transition-colors"
              title="Clear terminal"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div
        ref={terminalRef}
        className="p-4 max-h-96 overflow-y-auto font-mono text-sm"
        style={{ background: "#0d1117" }}
      >
        {status === "running" && (
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span className="animate-pulse">Executing...</span>
          </div>
        )}

        {output ? (
          <div className="space-y-0.5">{formatOutput(output, language)}</div>
        ) : (
          <div className="text-gray-600 italic">
            {status === "idle" ? "Ready to execute..." : "Waiting for output..."}
          </div>
        )}

        {status === "running" && (
          <div className="mt-2 flex items-center gap-1">
            <span className="w-2 h-4 bg-yellow-400 animate-pulse" />
          </div>
        )}
      </div>

      <div className="px-4 py-1.5 bg-gray-900 border-t border-gray-700 flex justify-between items-center">
        <span className="text-xs text-gray-600">
          {output.split("
").length} lines • {output.length} chars
        </span>
        <span className="text-xs text-gray-600">
          {language === "python" ? "🐍 Python 3.11" : language === "javascript" ? "⚡ Node.js 20" : "💻 Bash"}
        </span>
      </div>
    </div>
  );
}

export function CodeInput({
  onExecute,
  language = "python",
  placeholder = "Enter your code here...",
}: {
  onExecute: (code: string, language: string) => void;
  language?: string;
  placeholder?: string;
}) {
  const [code, setCode] = useState("");
  const [selectedLang, setSelectedLang] = useState(language);

  const languages = [
    { id: "python", name: "Python", icon: "🐍" },
    { id: "javascript", name: "JavaScript", icon: "⚡" },
    { id: "bash", name: "Bash", icon: "💻" },
  ];

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-700 bg-gray-950">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setSelectedLang(lang.id)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedLang === lang.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {lang.icon} {lang.name}
            </button>
          ))}
        </div>
        <button
          onClick={() => onExecute(code, selectedLang)}
          disabled={!code.trim()}
          className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded text-sm font-semibold transition-colors"
        >
          <Play className="w-4 h-4" />
          Run
        </button>
      </div>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={placeholder}
        className="w-full h-48 p-4 bg-gray-950 text-gray-300 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        spellCheck={false}
      />
    </div>
  );
}
