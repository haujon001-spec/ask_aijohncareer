import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  SSH_OPTS,
  SSH_TARGET,
  REMOTE_ROOT,
  REMOTE_UID_GID,
  backupRemote,
  isSyncEnabled,
  isSyncing,
} from './syncEngine.js';

/**
 * Single-file sync of src/data/john_profile.json between this laptop and the VPS
 * (28 Oct 2026). Deliberately NOT part of the bulk Sync allow-list: the profile
 * is the one file the user edits by hand, so it gets its own preview/confirm,
 * its own backups on both sides, and a hash check after every copy.
 *
 * Laptop-only (same guard as the bulk sync: no ssh key exists in the container).
 * Only this one fixed path can ever be read or written — callers pass no path.
 */

const REL = 'src/data/john_profile.json';
const REMOTE_FILE = `${REMOTE_ROOT}/${REL}`;

let busy = false;

export function isProfileSyncBusy() {
  return busy;
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function sshRun(command, input, { timeoutMs = 60000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn('ssh', [...SSH_OPTS, SSH_TARGET, command], { windowsHide: true });
    const chunks = [];
    let stderr = '';
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on('data', (c) => chunks.push(c));
    child.stderr.on('data', (c) => { stderr += c.toString(); });
    child.on('error', (err) => { clearTimeout(timer); resolve({ code: -1, stdout: Buffer.alloc(0), stderr: err.message }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout: Buffer.concat(chunks), stderr }); });
    child.stdin.on('error', () => {});
    child.stdin.end(input || undefined);
  });
}

async function readRemote() {
  const res = await sshRun(`cat '${REMOTE_FILE}' && stat -c '%Y' '${REMOTE_FILE}' >&2`);
  if (res.code !== 0) {
    throw new Error(`Cannot read the profile on the VPS (ssh exit ${res.code}): ${res.stderr.trim().slice(0, 200)}`);
  }
  const mtimeSec = Number(res.stderr.trim().split('\n').pop());
  return { buf: res.stdout, mtimeMs: Number.isFinite(mtimeSec) ? mtimeSec * 1000 : null };
}

function readLocal(projectRoot) {
  const abs = path.join(projectRoot, ...REL.split('/'));
  const buf = fs.readFileSync(abs);
  return { abs, buf, mtimeMs: Math.round(fs.statSync(abs).mtimeMs) };
}

function parseProfile(buf, where) {
  let env;
  try {
    env = JSON.parse(buf.toString('utf-8'));
  } catch (err) {
    throw new Error(`The ${where} profile is not valid JSON (${err.message}) — refusing to copy it.`);
  }
  const profile = env && env.profile;
  if (!profile || typeof profile !== 'object' || !profile.metadata || !profile.metadata.name) {
    throw new Error(`The ${where} profile has no profile.metadata.name — refusing to copy it.`);
  }
  return { env, profile };
}

function sectionSize(v) {
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === 'object') return Object.keys(v).length;
  if (typeof v === 'string') return v.length;
  return v == null ? 0 : 1;
}

function describe(side, buf, mtimeMs) {
  let env = null;
  try { env = JSON.parse(buf.toString('utf-8')); } catch { /* reported by parseProfile when it matters */ }
  return {
    sha256: sha256(buf),
    size: buf.length,
    mtimeMs,
    timestamp: env?.timestamp || null,
    yearsExperience: env?.profile?.metadata?.years_experience ?? null,
    side,
  };
}

function diffSections(localBuf, remoteBuf) {
  let l;
  let r;
  try { l = JSON.parse(localBuf.toString('utf-8')).profile || {}; } catch { l = {}; }
  try { r = JSON.parse(remoteBuf.toString('utf-8')).profile || {}; } catch { r = {}; }
  const out = [];
  for (const key of new Set([...Object.keys(l), ...Object.keys(r)])) {
    if (JSON.stringify(l[key]) === JSON.stringify(r[key])) continue;
    out.push({ section: key, local: key in l ? sectionSize(l[key]) : null, remote: key in r ? sectionSize(r[key]) : null });
  }
  return out;
}

function guard() {
  if (!isSyncEnabled()) throw new Error('Profile sync is only available from the laptop portal');
  if (busy || isSyncing()) throw new Error('A sync is already running');
}

export async function previewProfileSync(projectRoot) {
  guard();
  busy = true;
  try {
    const local = readLocal(projectRoot);
    const remote = await readRemote();
    const l = describe('local', local.buf, local.mtimeMs);
    const r = describe('remote', remote.buf, remote.mtimeMs);
    const status = l.sha256 === r.sha256 ? 'identical' : 'differ';
    let newer = 'same';
    if (status === 'differ') newer = (l.timestamp || '') >= (r.timestamp || '') ? 'local' : 'remote';
    return {
      status,
      newer,
      local: l,
      remote: r,
      changedSections: status === 'differ' ? diffSections(local.buf, remote.buf) : [],
    };
  } finally {
    busy = false;
  }
}

function nextLocalBak(abs, ymd) {
  for (let n = 1; n < 100; n += 1) {
    const candidate = `${abs}.${ymd}_V${n}.bak`;
    if (!fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Too many local profile backups for today');
}

/**
 * direction 'push' = laptop -> VPS, 'pull' = VPS -> laptop.
 * expectedLocalSha / expectedRemoteSha come from the preview the user confirmed;
 * if either side changed since, nothing is written (the user re-checks first).
 */
export async function runProfileSync({ projectRoot, direction, expectedLocalSha, expectedRemoteSha }) {
  guard();
  if (!['push', 'pull'].includes(direction)) throw new Error('direction must be push or pull');
  busy = true;
  const startedAt = new Date();
  const stamp = startedAt.toISOString().replace(/[:.]/g, '-');
  const ymd = startedAt.toISOString().slice(0, 10).replace(/-/g, '');
  try {
    const local = readLocal(projectRoot);
    const remote = await readRemote();
    const lSha = sha256(local.buf);
    const rSha = sha256(remote.buf);
    if (lSha !== expectedLocalSha || rSha !== expectedRemoteSha) {
      throw new Error('The profile changed on one side since you checked. Press "Check profile" again before copying.');
    }
    if (lSha === rSha) {
      return { success: true, direction, copied: false, message: 'Already identical — nothing to copy.', sha256: lSha };
    }

    parseProfile(direction === 'push' ? local.buf : remote.buf, direction === 'push' ? 'laptop' : 'VPS');
    const backups = {};

    if (direction === 'push') {
      // 1. Back up the VPS file twice: byte-exact under backup/sync_<stamp>/, and as a
      //    version-history entry (backup-<stamp>.json) so the live Profile tab can restore it.
      backups.vps = await backupRemote([REL], stamp);
      const old = parseProfile(remote.buf, 'VPS');
      const wrapper = {
        timestamp: startedAt.toISOString(),
        sourceFile: REMOTE_FILE,
        fileSize: remote.buf.length,
        profile: old.profile,
      };
      const versionName = `backup-${stamp.replace('Z', '')}.json`;
      const w = await sshRun(
        `cat > '${REMOTE_ROOT}/backup/${versionName}' && chown ${REMOTE_UID_GID} '${REMOTE_ROOT}/backup/${versionName}' && echo OK`,
        Buffer.from(JSON.stringify(wrapper, null, 2), 'utf-8'),
      );
      if (!w.stdout.toString().includes('OK')) throw new Error(`VPS version-history backup failed: ${w.stderr.slice(0, 200)}`);
      backups.vpsVersion = versionName;

      // 2. Write to a temp file in the same folder, then rename over the target (atomic).
      const tmp = `${REMOTE_FILE}.sync_tmp`;
      const put = await sshRun(
        `cat > '${tmp}' && chown ${REMOTE_UID_GID} '${tmp}' && chmod 644 '${tmp}' && mv -f '${tmp}' '${REMOTE_FILE}' && echo OK`,
        local.buf,
      );
      if (!put.stdout.toString().includes('OK')) throw new Error(`Writing the profile to the VPS failed: ${put.stderr.slice(0, 200)}`);
    } else {
      // pull: dated backup next to the file (soul.md naming) + a copy under backup/sync/
      const bak = nextLocalBak(local.abs, ymd);
      fs.copyFileSync(local.abs, bak);
      const extra = path.join(projectRoot, 'backup', 'sync', stamp, ...REL.split('/'));
      fs.mkdirSync(path.dirname(extra), { recursive: true });
      fs.copyFileSync(local.abs, extra);
      backups.local = path.relative(projectRoot, bak).split(path.sep).join('/');
      fs.writeFileSync(local.abs, remote.buf);
    }

    // Verify by hashing both sides again — this, not an exit code, decides success.
    const after = { local: readLocal(projectRoot), remote: await readRemote() };
    const expectedSha = direction === 'push' ? lSha : rSha;
    const verified = sha256(after.local.buf) === expectedSha && sha256(after.remote.buf) === expectedSha;
    const summary = {
      success: verified,
      direction,
      copied: true,
      verified,
      sha256: sha256(after.local.buf),
      backups,
      durationMs: Date.now() - startedAt.getTime(),
      startedAt: startedAt.toISOString(),
    };
    writeLog(projectRoot, summary);
    if (!verified) throw Object.assign(new Error('Copy finished but the two sides do not hash identical — check both files.'), { summary });
    return summary;
  } finally {
    busy = false;
  }
}

function writeLog(projectRoot, summary) {
  try {
    const dir = path.join(projectRoot, 'logs');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `sync_${summary.startedAt.slice(0, 10)}.log`);
    fs.appendFileSync(file, JSON.stringify({ kind: 'profile', ...summary }) + '\n', 'utf-8');
  } catch {
    // logging is best-effort
  }
}
