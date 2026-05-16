/**
 * Tools available to all models (Groq, Cloudflare, Anthropic)
 * These are functions that Claude/Llama can call
 */

export const AVAILABLE_TOOLS = [
  {
    name: "github_list_repos",
    description: "List all your GitHub repositories",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "github_list_issues",
    description: "List issues in a GitHub repository",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "GitHub owner/org" },
        repo: { type: "string", description: "Repository name" },
        state: { type: "string", enum: ["open", "closed", "all"], description: "Filter by state" },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "github_create_issue",
    description: "Create a new GitHub issue",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        title: { type: "string", description: "Issue title" },
        body: { type: "string", description: "Issue description" },
        labels: { type: "array", items: { type: "string" }, description: "Labels to add" },
      },
      required: ["owner", "repo", "title"],
    },
  },
  {
    name: "github_create_repo",
    description: "Create a new GitHub repository",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Repository name" },
        description: { type: "string", description: "Repository description" },
        private: { type: "boolean", description: "Make it private?" },
      },
      required: ["name"],
    },
  },
  {
    name: "github_update_file",
    description: "Update or create a file in GitHub repository",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        path: { type: "string", description: "File path" },
        content: { type: "string", description: "File content (will be base64 encoded)" },
        message: { type: "string", description: "Commit message" },
        branch: { type: "string", description: "Target branch (default: main)" },
      },
      required: ["owner", "repo", "path", "content", "message"],
    },
  },
  {
    name: "github_get_file",
    description: "Get contents of a file from GitHub",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        path: { type: "string", description: "File path" },
        ref: { type: "string", description: "Branch/tag/commit (default: main)" },
      },
      required: ["owner", "repo", "path"],
    },
  },
];

/**
 * Execute a tool and return the result
 * This calls your existing /api/mcp/github endpoint
 */
export async function executeTool(
  toolName: string,
  toolInput: Record<string, any>
): Promise<string> {
  try {
    // If it's a GitHub tool, route to /api/mcp/github
    if (toolName.startsWith("github_")) {
      const action = toolName.replace("github_", "").replace(/_/g, "_");
      
      // Map tool names to GitHub MCP actions
      const actionMap: Record<string, string> = {
        list_repos: "list_repos",
        list_issues: "list_issues",
        create_issue: "create_issue",
        create_repo: "create_repo",
        update_file: "create_or_update_file",
        get_file: "get_file",
      };

      const mappedAction = actionMap[action] || action;

      const response = await fetch("/api/mcp/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mappedAction,
          ...toolInput,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return JSON.stringify({ error: result.error || "Tool execution failed" });
      }

      return JSON.stringify(result.data || result);
    }

    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  } catch (err: any) {
    return JSON.stringify({ error: err.message || "Tool execution error" });
  }
}