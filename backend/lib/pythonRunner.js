import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { resolveUserKey, envVarForProvider, isValidProvider } from './llmKeys.js';

const SCRIPT_REL_PATH = path.join('scripts', 'jd_scorecard_resume_v2.py');
const SCRIPT_V3_REL_PATH = path.join('scripts', 'jd_scorecard_resume_v3.py');

const MODE_FLAGS = {
  scorecard: '--scorecard-only',
  resume: '--resume-only',
  coverletter: '--coverletter-only',
  all: null,
};

const LLM_KEY_ENV = {
  sonnet: 'OPENROUTER_API_KEY',
  gemini: 'OPENROUTER_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
};

// Which stored user-key provider (see llmKeys.js) backs each preset — used to
// look up a bring-your-own-key override before falling back to the server's
// .env-based key. "custom" isn't listed here since its provider comes from
// the request itself (customModel.provider), not a fixed preset.
const PROVIDER_FOR_LLM = {
  sonnet: 'openrouter',
  gemini: 'openrouter',
  deepseek: 'deepseek',
};

const TYPE_DIRS = { scorecard: 'ScoreCard', resume: 'resume', coverletter: 'CoverLetter' };
const OUTPUT_KEY = { scorecard: 'scorecard', resume: 'resume', coverletter: 'coverLetter' };

// Matches the script's own step markers, e.g. "🔍  [1/3] Generating JD Scorecard..."
const STEP_MARKER_RE = /\[(\d)\/3\]\s+([^\r\n]+)/;

// Tracks the single in-flight run (the API only ever allows one at a time, see
// jd_run.js's runInProgress lock) so a status-poll and a force-stop request
// both have something to read/act on without re-plumbing state through Express.
let currentRun = null; // { child, jdFile, currentStep, startedAtMs, cancelRequested } | null

// Shared "is a pipeline running" check (Phase 2, 11 Aug 2026) — used by both
// /api/jd/run (v2) and /api/jd-v3/run (v3) so a run of either kind blocks the
// other, per the user's "share one lock" decision. currentRun is already the
// single source of truth for "something is running" regardless of which
// script started it.
export function isPipelineBusy() {
  return currentRun !== null;
}

export function getCurrentRunStatus() {
  if (!currentRun) return { running: false };
  return {
    running: true,
    jdFile: currentRun.jdFile,
    currentStep: currentRun.currentStep,
    elapsedMs: Date.now() - currentRun.startedAtMs,
  };
}

// Force-stop: kills the in-flight python process. Whatever it already wrote to
// disk before this point stays (each output file is written as soon as that
// step finishes, so a cancelled run keeps its completed steps' files) — only
// the in-flight step's output is lost, per user decision 23 Jul 2026.
export function cancelCurrentRun() {
  if (!currentRun || !currentRun.child || currentRun.child.pid == null) {
    return { cancelled: false, reason: 'No run in progress' };
  }
  currentRun.cancelRequested = true;
  const pid = currentRun.child.pid;
  const jdFile = currentRun.jdFile;
  try {
    if (process.platform === 'win32') {
      // child.kill() alone can leave the python.exe orphaned on Windows in some
      // spawn configurations; taskkill with /t is the reliable way to end it.
      spawnSync('taskkill', ['/pid', String(pid), '/t', '/f']);
    } else {
      currentRun.child.kill('SIGTERM');
    }
  } catch (err) {
    return { cancelled: false, reason: err.message };
  }
  return { cancelled: true, jdFile };
}

export function isValidLlm(llm) {
  return llm === 'custom' || Object.prototype.hasOwnProperty.call(LLM_KEY_ENV, llm);
}

export function requiredKeyEnvFor(llm, customModel) {
  if (llm === 'custom') return envVarForProvider(customModel?.provider);
  return LLM_KEY_ENV[llm];
}

// True if either the server's .env-based key or a stored bring-your-own-key
// override (see llmKeys.js) satisfies this run's requirement.
export function hasUsableKey({ projectRoot, llm, customModel }) {
  const provider = llm === 'custom' ? customModel?.provider : PROVIDER_FOR_LLM[llm];
  if (!provider || !isValidProvider(provider)) return false;
  const envVar = envVarForProvider(provider);
  return !!(process.env[envVar] || resolveUserKey(projectRoot, provider));
}

export function resolvePythonBin(projectRoot) {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  const venvPython = process.platform === 'win32'
    ? path.join(projectRoot, '.venv', 'Scripts', 'python.exe')
    : path.join(projectRoot, '.venv', 'bin', 'python');
  if (fs.existsSync(venvPython)) return venvPython;
  return process.platform === 'win32' ? 'python' : 'python3';
}

function buildRunArgs({ jdAbsPath, llm, mode, refreshBlueprint, generateDocx, resumeAdjustment, customModel }) {
  const args = [jdAbsPath];
  const modeFlag = MODE_FLAGS[mode || 'all'];
  if (modeFlag) args.push(modeFlag);
  if (refreshBlueprint) args.push('--refresh-blueprint');
  if (generateDocx === false) args.push('--no-docx');
  if (resumeAdjustment) args.push('--ResumeAdjustment');
  if (llm === 'custom' && customModel?.slug && customModel?.provider) {
    args.push('--llm=custom', `--model=${customModel.slug}`, `--provider=${customModel.provider}`);
  } else {
    args.push(`--llm=${llm}`);
  }
  return args;
}

export function runJdPipeline({ projectRoot, jdAbsPath, llm, mode, refreshBlueprint, generateDocx, resumeAdjustment, customModel, timeoutMs }) {
  return new Promise((resolve) => {
    const pythonBin = resolvePythonBin(projectRoot);
    const scriptPath = path.join(projectRoot, SCRIPT_REL_PATH);
    const args = buildRunArgs({ jdAbsPath, llm, mode, refreshBlueprint, generateDocx, resumeAdjustment, customModel });

    console.log(`🐍 [jd-api] Spawning: ${pythonBin} ${scriptPath} ${args.join(' ')}`);

    // Bring-your-own-key: if the user has saved a personal key for this run's
    // provider, inject it into just this child process's env (never written to
    // process.env itself, never logged) — falls back to the server's own
    // .env-sourced key (already in process.env) when no user key is stored.
    const provider = llm === 'custom' ? customModel?.provider : PROVIDER_FOR_LLM[llm];
    const envOverride = {};
    if (provider && isValidProvider(provider)) {
      const userKey = resolveUserKey(projectRoot, provider);
      if (userKey) envOverride[envVarForProvider(provider)] = userKey;
    }

    // The script prints emoji to stdout; when spawned as a piped child process on
    // Windows, Python otherwise inherits the console's cp1252 codepage and crashes
    // encoding them (this doesn't happen when a human runs it in a real terminal).
    const child = spawn(pythonBin, [scriptPath, ...args], {
      cwd: projectRoot,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', ...envOverride },
    });

    currentRun = {
      child,
      jdFile: path.basename(jdAbsPath),
      currentStep: 'Starting…',
      startedAtMs: Date.now(),
      cancelRequested: false,
    };

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      currentRun = null;
      resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill();
      finish({ timedOut: true, exitCode: null, stdout, stderr });
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
      const stepMatch = text.match(STEP_MARKER_RE);
      if (stepMatch && currentRun) currentRun.currentStep = stepMatch[0].trim();
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('error', (err) => {
      finish({ spawnError: err.message, exitCode: null, stdout, stderr });
    });

    child.on('close', (code) => {
      const cancelled = currentRun?.cancelRequested || false;
      finish({ exitCode: code, stdout, stderr, timedOut: false, cancelled });
    });
  });
}

function buildRunArgsV3({ profileName, jdAbsPath, llm, mode, refreshBlueprint, generateDocx, resumeAdjustment, customModel }) {
  const args = [`--profile=${profileName}`, jdAbsPath];
  const modeFlag = MODE_FLAGS[mode || 'all'];
  if (modeFlag) args.push(modeFlag);
  if (refreshBlueprint) args.push('--refresh-blueprint');
  if (generateDocx === false) args.push('--no-docx');
  if (resumeAdjustment) args.push('--ResumeAdjustment');
  if (llm === 'custom' && customModel?.slug && customModel?.provider) {
    args.push('--llm=custom', `--model=${customModel.slug}`, `--provider=${customModel.provider}`);
  } else {
    args.push(`--llm=${llm}`);
  }
  return args;
}

// Profile-aware sibling of runJdPipeline() — spawns jd_scorecard_resume_v3.py
// instead of v2, and shares the same currentRun tracking (see isPipelineBusy)
// so status/cancel work identically for either script. runJdPipeline() itself
// is untouched.
export function runJdPipelineV3({ projectRoot, profileName, jdAbsPath, llm, mode, refreshBlueprint, generateDocx, resumeAdjustment, customModel, timeoutMs }) {
  return new Promise((resolve) => {
    const pythonBin = resolvePythonBin(projectRoot);
    const scriptPath = path.join(projectRoot, SCRIPT_V3_REL_PATH);
    const args = buildRunArgsV3({ profileName, jdAbsPath, llm, mode, refreshBlueprint, generateDocx, resumeAdjustment, customModel });

    console.log(`🐍 [jd-api] Spawning: ${pythonBin} ${scriptPath} ${args.join(' ')}`);

    const provider = llm === 'custom' ? customModel?.provider : PROVIDER_FOR_LLM[llm];
    const envOverride = {};
    if (provider && isValidProvider(provider)) {
      const userKey = resolveUserKey(projectRoot, provider);
      if (userKey) envOverride[envVarForProvider(provider)] = userKey;
    }

    const child = spawn(pythonBin, [scriptPath, ...args], {
      cwd: projectRoot,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', ...envOverride },
    });

    currentRun = {
      child,
      jdFile: path.basename(jdAbsPath),
      currentStep: 'Starting…',
      startedAtMs: Date.now(),
      cancelRequested: false,
    };

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      currentRun = null;
      resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill();
      finish({ timedOut: true, exitCode: null, stdout, stderr });
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
      const stepMatch = text.match(STEP_MARKER_RE);
      if (stepMatch && currentRun) currentRun.currentStep = stepMatch[0].trim();
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('error', (err) => {
      finish({ spawnError: err.message, exitCode: null, stdout, stderr });
    });

    child.on('close', (code) => {
      const cancelled = currentRun?.cancelRequested || false;
      finish({ exitCode: code, stdout, stderr, timedOut: false, cancelled });
    });
  });
}

function newestFileSince(dir, sinceMs) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .map((name) => {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      return { name, full, mtimeMs: stat.mtimeMs, isFile: stat.isFile() };
    })
    .filter((f) => f.isFile && f.mtimeMs >= sinceMs)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return files.length ? files[0] : null;
}

export function toRepoRelativePath(root, absPath) {
  return path.relative(root, absPath).split(path.sep).join('/');
}

export function parseMatchScore(content) {
  const m = content.match(/(\d{1,3})\s*\/\s*100\s*[—\-–]\s*(STRONG MATCH|GOOD MATCH|PARTIAL MATCH|WEAK MATCH)/i);
  if (!m) return null;
  return { score: Number(m[1]), maxScore: 100, verdict: m[2].toUpperCase() };
}

function parseSection(content, startHeader, endHeader) {
  const start = content.indexOf(startHeader);
  if (start === -1) return null;
  const afterStart = start + startHeader.length;
  const end = endHeader ? content.indexOf(endHeader, afterStart) : -1;
  const slice = end === -1 ? content.slice(afterStart) : content.slice(afterStart, end);
  const trimmed = slice.trim().slice(0, 4000);
  return trimmed || null;
}

/**
 * Discover the freshly-written output files for a run by scanning
 * data_processed/<employer>/<Type>/txt for files newer than runStartedAtMs.
 * Avoids re-deriving the Python script's DATE_STAMP format in Node.
 */
export function discoverOutputs({ projectRoot, employer, mode, runStartedAtMs }) {
  const types = mode === 'all' ? ['scorecard', 'resume', 'coverletter'] : [mode];
  const outputs = {};

  for (const type of types) {
    const txtDir = path.join(projectRoot, 'data_processed', employer, TYPE_DIRS[type], 'txt');
    const newest = newestFileSince(txtDir, runStartedAtMs);
    if (!newest) continue;

    const content = fs.readFileSync(newest.full, 'utf-8');
    const docxPath = path.join(projectRoot, 'data_processed', employer, TYPE_DIRS[type], 'docx', newest.name.replace(/\.txt$/, '.docx'));

    const entry = {
      txt: toRepoRelativePath(projectRoot, newest.full),
      docx: fs.existsSync(docxPath) ? toRepoRelativePath(projectRoot, docxPath) : null,
      content,
    };

    if (type === 'scorecard') {
      entry.matchScore = parseMatchScore(content);
      entry.strengths = parseSection(content, 'KEY STRENGTHS', 'GAPS & RISKS');
      entry.gaps = parseSection(content, 'GAPS & RISKS', 'TAILORING RECOMMENDATIONS');
    }

    outputs[OUTPUT_KEY[type]] = entry;
  }

  return outputs;
}

// Profile-aware sibling of discoverOutputs() — same logic, one extra
// data_processed/<profileName>/ path segment (matches jd_scorecard_resume_v3.py's
// own output layout). discoverOutputs() itself is untouched.
export function discoverOutputsV3({ projectRoot, profileName, employer, mode, runStartedAtMs }) {
  const types = mode === 'all' ? ['scorecard', 'resume', 'coverletter'] : [mode];
  const outputs = {};

  for (const type of types) {
    const txtDir = path.join(projectRoot, 'data_processed', profileName, employer, TYPE_DIRS[type], 'txt');
    const newest = newestFileSince(txtDir, runStartedAtMs);
    if (!newest) continue;

    const content = fs.readFileSync(newest.full, 'utf-8');
    const docxPath = path.join(projectRoot, 'data_processed', profileName, employer, TYPE_DIRS[type], 'docx', newest.name.replace(/\.txt$/, '.docx'));

    const entry = {
      txt: toRepoRelativePath(projectRoot, newest.full),
      docx: fs.existsSync(docxPath) ? toRepoRelativePath(projectRoot, docxPath) : null,
      content,
    };

    if (type === 'scorecard') {
      entry.matchScore = parseMatchScore(content);
      entry.strengths = parseSection(content, 'KEY STRENGTHS', 'GAPS & RISKS');
      entry.gaps = parseSection(content, 'GAPS & RISKS', 'TAILORING RECOMMENDATIONS');
    }

    outputs[OUTPUT_KEY[type]] = entry;
  }

  return outputs;
}
