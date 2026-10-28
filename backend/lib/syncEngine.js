import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Two-way sync of JD outputs/inputs between this laptop and the production VPS.
 *
 * Runs ONLY from the laptop, over the laptop's own SSH key (BatchMode, no
 * passwords, key never leaves ssh). Files move as a tar stream through ssh;
 * nothing is ever deleted; every overwritten file is backed up first; and the
 * result summary comes from re-hashing both sides afterwards, not from exit
 * codes.
 *
 * What syncs (allow-list, see isSyncable): generated outputs under
 * data_processed/<Employer>/{ScoreCard,resume,CoverLetter}/{txt,docx,pdf}/,
 * JD inputs data_raw/jd/txt/JD_*.txt and cached blueprints src/data/jd/JD_*.json.
 * Everything else (secrets/, .env*, profiles, other people's folders, .trash,
 * backups) can never match, so it can never be sent or fetched.
 */

export const SSH_TARGET = process.env.SYNC_SSH_TARGET || 'root@152.42.214.111';
export const REMOTE_ROOT = process.env.SYNC_REMOTE_ROOT || '/opt/john-career-copilot';
export const SSH_OPTS = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-o', 'ServerAliveInterval=15'];
export const REMOTE_UID_GID = process.env.SYNC_REMOTE_OWNER || '1001:1001'; // the jd-api container's uid
const SCAN_ROOTS = ['data_processed', 'data_raw/jd/txt', 'src/data/jd'];

// Folders under data_processed/ that belong to someone else or are scratch —
// the "does non-John data ship to production" question stays a deliberate,
// separate decision, so they are excluded here by default.
const DENY_FOLDERS = new Set(['ZZModelTest', 'MatinaFung', 'AlexRivera']);

let syncing = false;

export function isSyncEnabled() {
  // Only the laptop can sync: the production container has no ssh key, and a
  // key must never be placed there. /.dockerenv exists inside Docker.
  if (process.env.JD_SYNC_DISABLED === '1') return false;
  return !fs.existsSync('/.dockerenv');
}

export function getSyncInfo() {
  return { enabled: isSyncEnabled(), target: SSH_TARGET, remoteRoot: REMOTE_ROOT, busy: syncing };
}

export function isSyncing() {
  return syncing;
}

export function isSyncable(rel) {
  if (typeof rel !== 'string' || rel.includes('..') || rel.includes('\0') || rel.startsWith('/')) return false;
  const base = rel.split('/').pop();
  if (base.startsWith('~$') || /\.(bak|tmp)$/i.test(base)) return false;

  let m = rel.match(/^data_processed\/([^/]+)\/(ScoreCard|resume|CoverLetter)\/(txt|docx|pdf)\/[^/]+$/);
  if (m) return !m[1].startsWith('.') && !DENY_FOLDERS.has(m[1]);
  if (/^data_raw\/jd\/txt\/JD_[^/]+\.txt$/.test(rel)) return true;
  if (/^src\/data\/jd\/JD_[^/]+\.json$/.test(rel)) return true;
  return false;
}

/** "Company" a file belongs to — the unit the user resolves conflicts by. */
export function companyOf(rel) {
  let m = rel.match(/^data_processed\/([^/]+)\//);
  if (m) return m[1];
  m = rel.match(/\/JD_([^_/.]+)/);
  return m ? m[1] : '(other)';
}

// ── manifests ────────────────────────────────────────────────────────────────

function sha256File(abs) {
  return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
}

export function buildLocalManifest(projectRoot) {
  const manifest = new Map();
  for (const rootRel of SCAN_ROOTS) {
    const abs = path.join(projectRoot, ...rootRel.split('/'));
    if (!fs.existsSync(abs)) continue;
    const files = [];
    walk(abs, files);
    for (const file of files) {
      const rel = path.relative(projectRoot, file).split(path.sep).join('/');
      if (!isSyncable(rel)) continue;
      const st = fs.statSync(file);
      manifest.set(rel, { size: st.size, mtimeMs: Math.round(st.mtimeMs), sha256: sha256File(file) });
    }
  }
  return manifest;
}

/** Run a shell script on the VPS by feeding it to `sh -s` on stdin (no quoting pitfalls). */
export function runRemoteScript(script, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn('ssh', [...SSH_OPTS, SSH_TARGET, 'sh -s'], { windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on('data', (c) => { stdout += c.toString(); });
    child.stderr.on('data', (c) => { stderr += c.toString(); });
    child.on('error', (err) => { clearTimeout(timer); resolve({ code: -1, stdout, stderr: err.message }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
    child.stdin.on('error', () => {});
    child.stdin.end(script);
  });
}

export async function buildRemoteManifest() {
  const dirs = SCAN_ROOTS.join(' ');
  const script = `
cd '${REMOTE_ROOT}' || exit 3
echo '#META'
for d in ${dirs}; do [ -d "$d" ] && find "$d" -type f -not -path 'data_processed/.trash/*' -printf '%p\\t%s\\t%T@\\n'; done
echo '#HASH'
for d in ${dirs}; do [ -d "$d" ] && find "$d" -type f -not -path 'data_processed/.trash/*' -exec sha256sum {} +; done
echo '#END'
`;
  const res = await runRemoteScript(script);
  if (res.code !== 0 || !res.stdout.includes('#END')) {
    throw new Error(`Cannot read the VPS (ssh exit ${res.code}): ${(res.stderr || res.stdout).trim().slice(0, 300)}`);
  }
  const meta = new Map();
  const hashes = new Map();
  let section = null;
  for (const line of res.stdout.split('\n')) {
    if (line.startsWith('#')) { section = line.trim(); continue; }
    if (!line.trim()) continue;
    if (section === '#META') {
      const [rel, size, mtime] = line.split('\t');
      meta.set(rel, { size: Number(size), mtimeMs: Math.round(Number(mtime) * 1000) });
    } else if (section === '#HASH') {
      const m = line.match(/^([0-9a-f]{64})\s+\*?(.+)$/);
      if (m) hashes.set(m[2], m[1]);
    }
  }
  const manifest = new Map();
  for (const [rel, info] of meta) {
    if (!isSyncable(rel) || !hashes.has(rel)) continue;
    manifest.set(rel, { ...info, sha256: hashes.get(rel) });
  }
  return manifest;
}

// ── plan ─────────────────────────────────────────────────────────────────────

export function diffManifests(local, remote) {
  const entries = [];
  for (const rel of new Set([...local.keys(), ...remote.keys()])) {
    const l = local.get(rel);
    const r = remote.get(rel);
    let status;
    if (l && !r) status = 'newLocal';
    else if (!l && r) status = 'newRemote';
    else status = l.sha256 === r.sha256 ? 'identical' : 'conflict';
    entries.push({ rel, company: companyOf(rel), status, local: l || null, remote: r || null });
  }
  return entries;
}

export function groupByCompany(entries) {
  const groups = new Map();
  for (const e of entries) {
    if (!groups.has(e.company)) {
      groups.set(e.company, { company: e.company, newLocal: [], newRemote: [], conflicts: [], identical: 0 });
    }
    const g = groups.get(e.company);
    if (e.status === 'identical') g.identical += 1;
    else if (e.status === 'newLocal') g.newLocal.push(slim(e));
    else if (e.status === 'newRemote') g.newRemote.push(slim(e));
    else g.conflicts.push({ ...slim(e), newer: e.local.mtimeMs >= e.remote.mtimeMs ? 'local' : 'remote' });
  }
  return [...groups.values()].sort((a, b) => a.company.localeCompare(b.company));
}

function slim(e) {
  return {
    rel: e.rel,
    localSize: e.local?.size ?? null,
    remoteSize: e.remote?.size ?? null,
    localMtime: e.local?.mtimeMs ?? null,
    remoteMtime: e.remote?.mtimeMs ?? null,
  };
}

export async function buildPlan(projectRoot) {
  const [local, remote] = [buildLocalManifest(projectRoot), await buildRemoteManifest()];
  const entries = diffManifests(local, remote);
  const companies = groupByCompany(entries);
  const totals = companies.reduce(
    (t, g) => ({
      newLocal: t.newLocal + g.newLocal.length,
      newRemote: t.newRemote + g.newRemote.length,
      conflicts: t.conflicts + g.conflicts.length,
      identical: t.identical + g.identical,
    }),
    { newLocal: 0, newRemote: 0, conflicts: 0, identical: 0 },
  );
  return { entries, companies, totals };
}

// ── execution ────────────────────────────────────────────────────────────────

function tarBin() {
  // Explicit Windows bsdtar: Git-for-Windows' GNU tar would read "C:\..." as host:path.
  return process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
}

function waitClose(child) {
  return new Promise((resolve) => {
    let stderr = '';
    child.stderr.on('data', (c) => { stderr += c.toString(); });
    child.on('error', (err) => resolve({ code: -1, stderr: err.message }));
    child.on('close', (code) => resolve({ code, stderr }));
  });
}

async function pushFiles(projectRoot, rels, listFile) {
  fs.writeFileSync(listFile, rels.join('\n') + '\n', 'utf-8');
  const tar = spawn(tarBin(), ['-cf', '-', '-C', projectRoot, '-T', listFile], { windowsHide: true });
  const ssh = spawn('ssh', [...SSH_OPTS, SSH_TARGET, `tar -xf - --no-same-owner -C '${REMOTE_ROOT}'`], { windowsHide: true });
  tar.stdout.pipe(ssh.stdin);
  ssh.stdin.on('error', () => {});
  const [t, s] = await Promise.all([waitClose(tar), waitClose(ssh)]);
  if (t.code !== 0 || s.code !== 0) {
    throw new Error(`push failed (tar ${t.code}, ssh ${s.code}): ${(t.stderr + s.stderr).trim().slice(0, 300)}`);
  }
  // Container runs as uid 1001: extracted files/new folders are root-owned and
  // would block it from writing outputs. Re-own just the touched files and
  // their folders (never anything above the three synced roots).
  const chownScript = `
cd '${REMOTE_ROOT}' || exit 3
while IFS= read -r f; do
  d="$f"
  while [ "$d" != "." ] && [ "$d" != "/" ]; do
    case "$d" in data_processed|data_raw/jd/txt|src/data/jd) chown ${REMOTE_UID_GID} "$d"; break;; esac
    chown ${REMOTE_UID_GID} "$d" 2>/dev/null
    d=$(dirname "$d")
  done
done <<'LIST'
${rels.join('\n')}
LIST
echo CHOWN_OK
`;
  const res = await runRemoteScript(chownScript);
  if (!res.stdout.includes('CHOWN_OK')) throw new Error(`chown on VPS failed: ${res.stderr.slice(0, 200)}`);
}

async function pullFiles(projectRoot, rels) {
  const ssh = spawn('ssh', [...SSH_OPTS, SSH_TARGET, `tar -cf - -C '${REMOTE_ROOT}' -T -`], { windowsHide: true });
  const tar = spawn(tarBin(), ['-xf', '-', '-C', projectRoot], { windowsHide: true });
  ssh.stdout.pipe(tar.stdin);
  tar.stdin.on('error', () => {});
  ssh.stdin.on('error', () => {});
  ssh.stdin.end(rels.join('\n') + '\n');
  const [s, t] = await Promise.all([waitClose(ssh), waitClose(tar)]);
  if (s.code !== 0 || t.code !== 0) {
    throw new Error(`pull failed (ssh ${s.code}, tar ${t.code}): ${(s.stderr + t.stderr).trim().slice(0, 300)}`);
  }
}

export async function backupRemote(rels, stamp) {
  const script = `
cd '${REMOTE_ROOT}' || exit 3
B="backup/sync_${stamp}"
while IFS= read -r f; do
  if [ -f "$f" ]; then mkdir -p "$B/$(dirname "$f")" && cp -p "$f" "$B/$f"; fi
done <<'LIST'
${rels.join('\n')}
LIST
echo BACKUP_OK
`;
  const res = await runRemoteScript(script);
  if (!res.stdout.includes('BACKUP_OK')) throw new Error(`VPS backup failed: ${res.stderr.slice(0, 200)}`);
  return `${REMOTE_ROOT}/backup/sync_${stamp}`;
}

function backupLocal(projectRoot, rels, stamp) {
  const dir = path.join(projectRoot, 'backup', 'sync', stamp);
  for (const rel of rels) {
    const src = path.join(projectRoot, ...rel.split('/'));
    if (!fs.existsSync(src)) continue;
    const dest = path.join(dir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  return dir;
}

/**
 * Re-computes the plan itself (never trusts file lists from the client), applies
 * it, then verifies by hashing both sides again.
 *   direction:   'both' | 'push' (laptop -> VPS) | 'pull' (VPS -> laptop)
 *   companies:   optional array — only these companies are touched (default: all)
 *   resolutions: { <company>: 'local' | 'remote' | 'skip' } for CONFLICTS only;
 *                a conflicting company with no resolution is skipped, never overwritten.
 */
export async function runSync({ projectRoot, direction = 'both', resolutions = {}, companies = null }) {
  if (syncing) throw new Error('A sync is already running');
  syncing = true;
  const startedAt = new Date();
  const stamp = startedAt.toISOString().replace(/[:.]/g, '-');
  try {
    const plan = await buildPlan(projectRoot);
    const doPush = direction === 'both' || direction === 'push';
    const doPull = direction === 'both' || direction === 'pull';

    const push = [];
    const pull = [];
    const overwriteRemote = [];
    const overwriteLocal = [];
    const skippedConflicts = [];

    // Optional: restrict to the companies the user ticked in the preview.
    const scoped = Array.isArray(companies) ? plan.entries.filter((e) => companies.includes(e.company)) : plan.entries;

    for (const e of scoped) {
      if (e.status === 'newLocal' && doPush) push.push(e.rel);
      else if (e.status === 'newRemote' && doPull) pull.push(e.rel);
      else if (e.status === 'conflict') {
        const choice = resolutions[e.company];
        if (choice === 'local' && doPush) { push.push(e.rel); overwriteRemote.push(e.rel); }
        else if (choice === 'remote' && doPull) { pull.push(e.rel); overwriteLocal.push(e.rel); }
        else skippedConflicts.push(e.rel);
      }
    }

    const backups = {};
    if (overwriteRemote.length) backups.vps = await backupRemote(overwriteRemote, stamp);
    if (overwriteLocal.length) backups.local = backupLocal(projectRoot, overwriteLocal, stamp);

    const errors = [];
    const tmpList = path.join(os.tmpdir(), `jd_sync_${process.pid}_${Date.now()}.txt`);
    try {
      if (push.length) {
        try { await pushFiles(projectRoot, push, tmpList); } catch (err) { errors.push(err.message); }
      }
      if (pull.length) {
        try { await pullFiles(projectRoot, pull); } catch (err) { errors.push(err.message); }
      }
    } finally {
      fs.rmSync(tmpList, { force: true });
    }

    // Verify by hash — this, not the exit codes, decides what is reported as copied.
    const moved = [...push, ...pull];
    let verified = 0;
    const failed = [];
    if (moved.length) {
      const [local, remote] = [buildLocalManifest(projectRoot), await buildRemoteManifest()];
      for (const rel of moved) {
        const l = local.get(rel);
        const r = remote.get(rel);
        if (l && r && l.sha256 === r.sha256) verified += 1;
        else failed.push(rel);
      }
    }

    const summary = {
      direction,
      startedAt: startedAt.toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
      pushed: push.filter((r) => !failed.includes(r)).length,
      pulled: pull.filter((r) => !failed.includes(r)).length,
      verified,
      failed,
      skippedConflicts: skippedConflicts.length,
      skippedConflictFiles: skippedConflicts,
      identical: plan.totals.identical,
      backups,
      errors,
    };
    writeLog(projectRoot, summary);
    return summary;
  } finally {
    syncing = false;
  }
}

function writeLog(projectRoot, summary) {
  try {
    const dir = path.join(projectRoot, 'logs');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `sync_${summary.startedAt.slice(0, 10)}.log`);
    fs.appendFileSync(file, JSON.stringify(summary) + '\n', 'utf-8');
  } catch {
    // logging is best-effort
  }
}
