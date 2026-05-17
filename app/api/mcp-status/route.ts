import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const authHeader = req.headers.get("authorization") || "";

    // Detect connected MCP connectors
    const connectors = {
      github: {
        connected: cookieHeader.includes("mcp_oauth_github=") || authHeader.includes("github"),
        status: cookieHeader.includes("mcp_oauth_github=") ? "connected" : "disconnected",
        capabilities: [
          "List repositories",
          "Create issues",
          "Push code",
          "Manage pull requests",
          "Create repositories",
        ],
      },
      slack: {
        connected: cookieHeader.includes("mcp_oauth_slack=") || authHeader.includes("slack"),
        status: cookieHeader.includes("mcp_oauth_slack=") ? "connected" : "disconnected",
        capabilities: ["Send messages", "Create channels", "List conversations"],
      },
      discord: {
        connected: cookieHeader.includes("mcp_oauth_discord=") || authHeader.includes("discord"),
        status: cookieHeader.includes("mcp_oauth_discord=") ? "connected" : "disconnected",
        capabilities: ["Send webhooks", "Create channels", "Manage roles"],
      },
      linear: {
        connected: cookieHeader.includes("mcp_oauth_linear=") || authHeader.includes("linear"),
        status: cookieHeader.includes("mcp_oauth_linear=") ? "connected" : "disconnected",
        capabilities: ["Create issues", "Update issues", "List projects"],
      },
      notion: {
        connected: cookieHeader.includes("mcp_oauth_notion=") || authHeader.includes("notion"),
        status: cookieHeader.includes("mcp_oauth_notion=") ? "connected" : "disconnected",
        capabilities: ["Read databases", "Create pages", "Update content"],
      },
      google_drive: {
        connected: cookieHeader.includes("mcp_oauth_google_drive=") || authHeader.includes("google_drive"),
        status: cookieHeader.includes("mcp_oauth_google_drive=") ? "connected" : "disconnected",
        capabilities: ["Read files", "Write files", "Share files"],
      },
      email: {
        connected: cookieHeader.includes("mcp_oauth_email=") || authHeader.includes("email"),
        status: cookieHeader.includes("mcp_oauth_email=") ? "connected" : "disconnected",
        capabilities: ["Send emails", "Create drafts", "Manage filters"],
      },
    };

    // Get connected status
    const connectedList = Object.entries(connectors)
      .filter(([_, c]) => c.connected)
      .map(([name]) => name);

    const disconnectedList = Object.entries(connectors)
      .filter(([_, c]) => !c.connected)
      .map(([name]) => name);

    return Response.json({
      success: true,
      summary: {
        total: Object.keys(connectors).length,
        connected: connectedList.length,
        disconnected: disconnectedList.length,
      },
      connectors,
      connected: connectedList,
      disconnected: disconnectedList,
      message:
        connectedList.length > 0
          ? `Models can now use: ${connectedList.join(", ")}`
          : "No MCP connectors connected. Go to Settings > Connectors to add some.",
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { connector } = await req.json();

    if (!connector) {
      return Response.json({ error: "Missing connector name" }, { status: 400 });
    }

    // Get specific connector status
    const cookieHeader = req.headers.get("cookie") || "";

    const isConnected = cookieHeader.includes(`mcp_oauth_${connector}=`);

    return Response.json({
      success: true,
      connector,
      connected: isConnected,
      status: isConnected ? "ready to use" : "not connected",
      action: isConnected
        ? `Claude can now use ${connector}`
        : `Go to Settings > Connectors to connect ${connector}`,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
