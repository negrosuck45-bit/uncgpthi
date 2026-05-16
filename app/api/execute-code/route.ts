import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

// Rate limiting map (in production use Redis)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const window = 60000; // 1 minute
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

// Security: Block dangerous commands
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+\//,
  />\s*\/dev\/null/,
  /mkfs/,
  /dd\s+if=/,
  /:\(\)\{\s*:\|:\s*\&\s*\};:/, // fork bomb
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
      return { safe: false, reason: 'Potentially dangerous command blocked' };
    }
  }

  // Additional Python-specific blocks
  if (language === 'python') {
    const blockedModules = ['os.system', 'subprocess.call', 'subprocess.run', 'subprocess.Popen', 
      'eval(', 'exec(', '__import__', 'import os', 'import subprocess', 'shutil.rmtree', 'pathlib.Path'];
    for (const mod of blockedModules) {
      if (code.includes(mod)) {
        return { safe: false, reason: `Blocked module/function: ${mod}` };
      }
    }
  }

  // JavaScript-specific blocks
  if (language === 'javascript') {
    const blockedPatterns = ['require("fs")', 'require("child_process")', 'process.exit', 
      'eval(', 'Function(', 'setTimeout(', 'setInterval('];
    for (const pat of blockedPatterns) {
      if (code.includes(pat)) {
        return { safe: false, reason: `Blocked pattern: ${pat}` };
      }
    }
  }

  return { safe: true };
}

async function executePython(code: string, tempDir: string): Promise<{ output: string; error?: string; executionTime: number }> {
  const fileName = `script_${randomUUID()}.py`;
  const filePath = join(tempDir, fileName);

  // Wrap code with timeout and output capture
  const wrappedCode = `
import sys
import json
import traceback
from io import StringIO

# Redirect stdout/stderr
old_stdout = sys.stdout
old_stderr = sys.stderr
sys.stdout = mystdout = StringIO()
sys.stderr = mystderr = StringIO()

try:
${code.split('\n').map(line => '    ' + line).join('\n')}
except Exception as e:
    print(f"Error: {str(e)}")
    traceback.print_exc()

output = mystdout.getvalue()
errors = mystderr.getvalue()

sys.stdout = old_stdout
sys.stderr = old_stderr

print(json.dumps({"output": output, "error": errors}))
`;

  await writeFile(filePath, wrappedCode);

  const startTime = Date.now();
  try {
    const { stdout, stderr } = await execAsync(`python3 "${filePath}"`, { 
      timeout: 10000,
      cwd: tempDir,
      env: { ...process.env, PYTHONPATH: '' }
    });

    const executionTime = Date.now() - startTime;

    // Clean up
    try { await unlink(filePath); } catch {}

    if (stderr && !stdout) {
      return { output: '', error: stderr, executionTime };
    }

    // Try to parse JSON output
    try {
      const parsed = JSON.parse(stdout.trim().split('\n').pop() || '{}');
      return { 
        output: parsed.output || stdout, 
        error: parsed.error || stderr || undefined,
        executionTime 
      };
    } catch {
      return { output: stdout, error: stderr || undefined, executionTime };
    }
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    try { await unlink(filePath); } catch {}

    if (error.killed || error.signal === 'SIGTERM') {
      return { output: '', error: 'Execution timed out (10s limit)', executionTime };
    }
    return { output: '', error: error.stderr || error.message, executionTime };
  }
}

async function executeJavaScript(code: string, tempDir: string): Promise<{ output: string; error?: string; executionTime: number }> {
  const fileName = `script_${randomUUID()}.js`;
  const filePath = join(tempDir, fileName);

  // Wrap with console capture and timeout
  const wrappedCode = `
const originalLog = console.log;
const originalError = console.error;
let output = [];
let errors = [];

console.log = (...args) => output.push(args.join(' '));
console.error = (...args) => errors.push(args.join(' '));

try {
${code.split('\n').map(line => '  ' + line).join('\n')}
} catch (e) {
  errors.push('Error: ' + e.message);
  errors.push(e.stack);
}

console.log = originalLog;
console.error = originalError;

process.stdout.write(JSON.stringify({output: output.join('\n'), error: errors.join('\n')}));
`;

  await writeFile(filePath, wrappedCode);

  const startTime = Date.now();
  try {
    const { stdout, stderr } = await execAsync(`node "${filePath}"`, { 
      timeout: 10000,
      cwd: tempDir
    });

    const executionTime = Date.now() - startTime;
    try { await unlink(filePath); } catch {}

    try {
      const parsed = JSON.parse(stdout);
      return { 
        output: parsed.output || stdout, 
        error: parsed.error || stderr || undefined,
        executionTime 
      };
    } catch {
      return { output: stdout, error: stderr || undefined, executionTime };
    }
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    try { await unlink(filePath); } catch {}

    if (error.killed || error.signal === 'SIGTERM') {
      return { output: '', error: 'Execution timed out (10s limit)', executionTime };
    }
    return { output: '', error: error.stderr || error.message, executionTime };
  }
}

async function executeBash(code: string): Promise<{ output: string; error?: string; executionTime: number }> {
  const startTime = Date.now();

  // Additional bash safety: whitelist allowed commands
  const allowedCommands = ['echo', 'cat', 'ls', 'pwd', 'date', 'whoami', 'uname', 'head', 'tail', 'grep', 'sort', 'wc', 'find', 'printf', 'seq', 'bc', 'python3', 'node', 'npm', 'yarn', 'git', 'curl', 'wget'];
  const lines = code.split('\n').filter(l => l.trim());

  for (const line of lines) {
    const cmd = line.trim().split(/\s+/)[0];
    if (!allowedCommands.includes(cmd)) {
      return { 
        output: '', 
        error: `Command '${cmd}' not allowed. Allowed: ${allowedCommands.join(', ')}`,
        executionTime: Date.now() - startTime 
      };
    }
  }

  try {
    const { stdout, stderr } = await execAsync(code, { 
      timeout: 10000,
      env: { PATH: '/usr/local/bin:/usr/bin:/bin' }
    });

    const executionTime = Date.now() - startTime;
    return { output: stdout, error: stderr || undefined, executionTime };
  } catch (error: any) {
    const executionTime = Date.now() - startTime;

    if (error.killed || error.signal === 'SIGTERM') {
      return { output: '', error: 'Execution timed out (10s limit)', executionTime };
    }
    return { output: error.stdout || '', error: error.stderr || error.message, executionTime };
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again in 1 minute.' }, { status: 429 });
    }

    const { code, language } = await req.json();

    if (!code || !language) {
      return NextResponse.json({ error: 'Code and language required' }, { status: 400 });
    }

    if (!['python', 'javascript', 'bash'].includes(language)) {
      return NextResponse.json({ error: 'Language must be python, javascript, or bash' }, { status: 400 });
    }

    // Security check
    const safety = isCodeSafe(code, language);
    if (!safety.safe) {
      return NextResponse.json({ error: safety.reason, blocked: true }, { status: 403 });
    }

    // Create temp directory
    const tempDir = join('/tmp', 'unc-gpt-code', randomUUID());
    await mkdir(tempDir, { recursive: true });

    let result;

    switch (language) {
      case 'python':
        result = await executePython(code, tempDir);
        break;
      case 'javascript':
        result = await executeJavaScript(code, tempDir);
        break;
      case 'bash':
        result = await executeBash(code);
        break;
      default:
        result = { output: '', error: 'Unsupported language', executionTime: 0 };
    }

    // Cleanup temp dir
    try {
      const { exec: execSync } = require('child_process');
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
    return NextResponse.json({ 
      error: error.message || 'Execution failed',
      success: false 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'Code execution API ready',
    languages: ['python', 'javascript', 'bash'],
    limits: { timeout: '10s', maxRequests: '10/minute' }
  });
}
