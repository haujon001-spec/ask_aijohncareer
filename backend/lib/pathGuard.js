import path from 'path';

export class PathGuardError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Resolve relPath inside root, rejecting traversal/absolute paths and
 * (optionally) enforcing an extension whitelist. Throws PathGuardError.
 */
export function resolveWithinRoot(root, relPath, { allowedExtensions } = {}) {
  if (typeof relPath !== 'string' || !relPath.trim()) {
    throw new PathGuardError('Path is required');
  }
  if (relPath.includes('\0')) {
    throw new PathGuardError('Invalid path');
  }
  if (relPath.includes('..')) {
    throw new PathGuardError('Invalid path: parent directory traversal not allowed');
  }
  if (path.isAbsolute(relPath) || /^[A-Za-z]:/.test(relPath) || relPath.startsWith('/') || relPath.startsWith('\\')) {
    throw new PathGuardError('Invalid path: absolute paths not allowed');
  }

  const resolved = path.resolve(root, relPath);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (!resolved.startsWith(rootWithSep)) {
    throw new PathGuardError('Invalid path: outside allowed directory');
  }

  if (allowedExtensions) {
    const ext = path.extname(resolved).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new PathGuardError(`Invalid file extension: ${ext || '(none)'}`);
    }
  }

  return resolved;
}
