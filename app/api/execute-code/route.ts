import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);
const rateLimit = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const window = 60000;
  const maxRequests = 10;
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + window });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//,
  />\s*\/dev\/null/,
  /mkfs/,
  /dd\s+if=/,
  /:\(\)\{\s*:\|:\s*\&\s*\};:/,
  /curl\s+.*\|\s*sh/,
  /wget\s+.*\|\s*sh/,
  /eval\s*\(/,
  /child_process/,
  /fs\.unlinkSync\s*\(\s*['"`]\//,
  /os\.system/,
  /subprocess\.call\s*\(\s*['"`]rm/,
];

function isCodeSafe(code: string, language: string): { safe: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      return { safe: false, reason: "Potentially dangerous command blocked" };
    }
  }
  if (language === "python") {
    const blockedModules = ["os.system", "subprocess.call", "subprocess.run", "subprocess.Popen", "eval(", "exec(", "__import__", "shutil.rmtree"];
    for (const mod of blockedModules) {
      if (code.includes(mod)) {
        return { safe: false, reason: `Blocked module/function: ${mod}` };
      }
    }
  }
  if (language === "javascript") {
    const blockedPatterns = ['require("fs")', 'require("child_process")', "process.exit", "eval(", "Function(", "setTimeout(", "setInterval("];
    for (const pat of blockedPatterns) {
      if (code.includes(pat)) {
        return { safe: false, reason: `Blocked pattern: ${pat}` };
      }
    }
  }
  return { safe: true };
}

async function executePython(code: string, tempDir: string) {
  const fileName = `script_${randomUUID()}.py`;
  const filePath = join(tempDir, fileName);
  const wrappedCode = `import sys\nimport json\nimport traceback\nfrom io import StringIO\nold_stdout = sys.stdout\nold_stderr = sys.stderr\nsys.stdout = mystdout = StringIO()\nsys.stderr = mystderr = StringIO()\ntry:\n${code.split("\n").map(line => "    " + line).join("\n")}\nexcept Exception as e:\n    print(f"Error: {str(e)}")\n    traceback.print_exc()\noutput = mystdout.getvalue()\nerrors = mystderr.getvalue()\nsys.stdout = old_stdout\nsys.stderr = old_stderr\nprint(json.dumps({"output": output, "error": errors}))`;
  await writeFile(filePath, wrappedCode);
  const startTime = Date.now();
  try {
    const { stdout, stderr } = await execAsync(`python3 "${filePath}"`, { timeout: 10000, cwd: tempDir });
    const executionTime = Date.now() - startTime;
    try { await unlink(filePath); } catch {}
    try {
      const parsed = JSON.parse(stdout.trim().split("\n").pop() || "{}");
      return { output: parsed.output || stdout, error: parsed.error || stderr || undefined, executionTime };
    } catch {
      return { output: stdout, error: stderr || undefined, executionTime };
    }
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    try { await unlink(filePath); } catch {}
    if (error.killed || error.signal === "SIGTERM") {
      return { output: "", error: "Execution timed out (10s limit)", executionTime };
    }
    return { output: "", error: error.stderr || error.message, executionTime };
  }
}

async function executeJavaScript(code: string, tempDir: string) {
  const fileName = `script_${randomUUID()}.js`;
  const filePath = join(tempDir, fileName);
  const wrappedCode = `const originalLog = console.log;\nconst originalError = console.error;\nlet output = [];\nlet errors = [];\nconsole.log = (...args) => output.push(args.join(" "));\nconsole.error = (...args) => errors.push(args.join(" "));\ntry {\n${code.split("\n").map(line => "  " + line).join("\n")}\n} catch (e) {\n  errors.push("Error: " + e.message);\n  errors.push(e.stack);\n}\nconsole.log = originalLog;\nconsole.error = originalError;\nprocess.stdout.write(JSON.stringify({output: output.join("\n"), error: errors.join("\n")}));`;
  await writeFile(filePath, wrappedCode);
  const startTime = Date.now();
  try {
    const { stdout, stderr } = await execAsync(`node "${filePath}"`, { timeout: 10000, cwd: tempDir });
    const executionTime = Date.now() - startTime;
    try { await unlink(filePath); } catch {}
    try {
      const parsed = JSON.parse(stdout);
      return { output: parsed.output || stdout, error: parsed.error || stderr || undefined, executionTime };
    } catch {
      return { output: stdout, error: stderr || undefined, executionTime };
    }
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    try { await unlink(filePath); } catch {}
    if (error.killed || error.signal === "SIGTERM") {
      return { output: "", error: "Execution timed out (10s limit)", executionTime };
    }
    return { output: "", error: error.stderr || error.message, executionTime };
  }
}

async function executeBash(code: string) {
  const startTime = Date.now();
  const allowedCommands = ["echo", "cat", "ls", "pwd", "date", "whoami", "uname", "head", "tail", "grep", "sort", "wc", "find", "printf", "seq", "bc", "python3", "node", "npm", "yarn", "git", "curl", "wget"];
  const lines = code.split("\n").filter(l => l.trim());
  for (const line of lines) {
    const cmd = line.trim().split(/\s+/)[0];
    if (!allowedCommands.includes(cmd)) {
      return { output: "", error: `Command '${cmd}' not allowed. Allowed: ${allowedCommands.join(", ")}`, executionTime: Date.now() - startTime };
    }
  }
  try {
    const { stdout, stderr } = await execAsync(code, { timeout: 10000, env: { PATH: "/usr/local/bin:/usr/bin:/bin" } });
    const executionTime = Date.now() - startTime;
    return { output: stdout, error: stderr || undefined, executionTime };
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    if (error.killed || error.signal === "SIGTERM") {
      return { output: "", error: "Execution timed out (10s limit)", executionTime };
    }
    return { output: error.stdout || "", error: error.stderr || error.message, executionTime };
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again in 1 minute." }, { status: 429 });
    }
    const { code, language } = await req.json();
    if (!code || !language) {
      return NextResponse.json({ error: "Code and language required" }, { status: 400 });
    }
    if (!["python", "javascript", "bash"].includes(language)) {
      return NextResponse.json({ error: "Language must be python, javascript, or bash" }, { status: 400 });
    }
    const safety = isCodeSafe(code, language);
    if (!safety.safe) {
      return NextResponse.json({ error: safety.reason, blocked: true }, { status: 403 });
    }
    const tempDir = join("/tmp", "unc-gpt-code", randomUUID());
    await mkdir(tempDir, { recursive: true });
    let result;
    switch (language) {
      case "python": result = await executePython(code, tempDir); break;
      case "javascript": result = await executeJavaScript(code, tempDir); break;
      case "bash": result = await executeBash(code); break;
      default: result = { output: "", error: "Unsupported language", executionTime: 0 };
    }
    try {
      const { exec: execSync } = require("child_process");
      execSync(`rm -rf "${tempDir}"`);
    } catch {}
    return NextResponse.json({
      success: !result.error,
      output: result.output,
      error: result.error,
      language,
      executionTime: result.executionTime,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Execution failed", success: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Code execution API ready", languages: ["python", "javascript", "bash"], limits: { timeout: "10s", maxRequests: "10/minute" } });
}
