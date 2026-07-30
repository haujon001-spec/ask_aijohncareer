// Client for the standalone JD Automation API (backend/jd_api_server.js, default port 3010).
// Kept separate from the main chat backend calls in App.jsx since it's a different server/process.

export const JD_API_BASE = import.meta.env.VITE_JD_API_BASE || 'http://localhost:3010'

async function request(path, options = {}) {
  const resp = await fetch(`${JD_API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // send/receive the httpOnly MFA session cookie
    ...options
  })

  let data = null
  try {
    data = await resp.json()
  } catch {
    // non-JSON or empty body — leave data as null
  }

  if (!resp.ok) {
    const err = new Error((data && data.error) || `HTTP ${resp.status}`)
    err.status = resp.status
    err.data = data
    throw err
  }

  return data
}

export function checkHealth() {
  return request('/api/health')
}

export function uploadJd({ employer, role, jdText, overwrite }) {
  return request('/api/jd/upload', {
    method: 'POST',
    body: JSON.stringify({ employer, role, jdText, overwrite })
  })
}

export function runJd({ jdFile, llm, mode, refreshBlueprint, generateDocx, resumeAdjustment, customModel }) {
  return request('/api/jd/run', {
    method: 'POST',
    body: JSON.stringify({ jdFile, llm, mode, refreshBlueprint, generateDocx, resumeAdjustment, customModel })
  })
}

// ---- Bring-your-own-key LLM settings ----

export function fetchLlmKeyStatus() {
  return request('/api/settings/llm-keys')
}

export function saveLlmKey(provider, apiKey) {
  return request('/api/settings/llm-keys', {
    method: 'POST',
    body: JSON.stringify({ provider, apiKey })
  })
}

export function clearLlmKey(provider) {
  return request(`/api/settings/llm-keys/${provider}`, { method: 'DELETE' })
}

export function fetchRunStatus() {
  return request('/api/jd/run/status')
}

export function cancelRun() {
  return request('/api/jd/run/cancel', { method: 'POST' })
}

export function fetchHistory({ employer, limit } = {}) {
  const params = new URLSearchParams()
  if (employer) params.set('employer', employer)
  if (limit) params.set('limit', limit)
  const qs = params.toString()
  return request(`/api/history${qs ? `?${qs}` : ''}`)
}

export function deleteHistoryCompany(employer) {
  return request(`/api/history/${encodeURIComponent(employer)}`, { method: 'DELETE' })
}

export function deleteHistoryJob(employer, { roleTag, date }) {
  const params = new URLSearchParams({ date })
  if (roleTag) params.set('roleTag', roleTag)
  return request(`/api/history/${encodeURIComponent(employer)}/run?${params.toString()}`, { method: 'DELETE' })
}

export function fetchTrash() {
  return request('/api/history/trash')
}

export function restoreTrash(trashId, employer) {
  return request(`/api/history/trash/${encodeURIComponent(trashId)}/${encodeURIComponent(employer)}/restore`, { method: 'POST' })
}

export function fetchProfile() {
  return request('/api/profile-view')
}

export function profileExportUrl(format) {
  return `${JD_API_BASE}/api/profile-view/export?format=${format}`
}

// ---- Profile edit / version history / Update-from-Resume ----

export function saveProfileManual({ ops, expectedTimestamp }) {
  return request('/api/profile/manual', {
    method: 'POST',
    body: JSON.stringify({ ops, expectedTimestamp })
  })
}

export function fetchProfileVersions() {
  return request('/api/profile/versions')
}

export function fetchProfileVersion(filename) {
  return request(`/api/profile/versions/${encodeURIComponent(filename)}`)
}

export function restoreProfileVersion(filename) {
  return request(`/api/profile/versions/${encodeURIComponent(filename)}/restore`, { method: 'POST' })
}

export function proposeProfileUpdate({ sources, llm, customModel }) {
  return request('/api/profile/update-from-resume/propose', {
    method: 'POST',
    body: JSON.stringify({ sources, llm, customModel })
  })
}

export function approveProfileUpdate({ proposalId, approvedItemIds }) {
  return request('/api/profile/update-from-resume/approve', {
    method: 'POST',
    body: JSON.stringify({ proposalId, approvedItemIds })
  })
}

// Normalizes the two download-path shapes returned by the API:
//  - /api/jd/run's downloadUrls are already-prefixed: "/api/download/Acme/ScoreCard/txt/x.txt"
//  - /api/history's scorecard/resume/coverLetter fields are repo-relative: "data_processed/Acme/ScoreCard/txt/x.txt"
export function toDownloadUrl(pathOrUrl) {
  if (!pathOrUrl) return null
  if (pathOrUrl.startsWith('/api/download/')) {
    return `${JD_API_BASE}${pathOrUrl}`
  }
  const relative = pathOrUrl.replace(/^data_processed\//, '')
  return `${JD_API_BASE}/api/download/${relative}`
}

// Same path-normalization as toDownloadUrl, but for the docx view-mode endpoint.
function toViewPath(pathOrUrl) {
  if (!pathOrUrl) return null
  if (pathOrUrl.startsWith('/api/download/')) {
    return pathOrUrl.replace(/^\/api\/download\//, '')
  }
  return pathOrUrl.replace(/^data_processed\//, '')
}

export function viewDoc(pathOrUrl) {
  const relative = toViewPath(pathOrUrl)
  return request(`/api/view/${relative}`)
}

// ---- Portal auth (MFA: password + TOTP) ----

export function fetchAuthStatus() {
  return request('/api/auth/status')
}

export function enroll({ password }) {
  return request('/api/auth/enroll', {
    method: 'POST',
    body: JSON.stringify({ password })
  })
}

export function confirmEnroll({ totpCode }) {
  return request('/api/auth/enroll/confirm', {
    method: 'POST',
    body: JSON.stringify({ totpCode })
  })
}

export function login({ password, totpCode }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password, totpCode })
  })
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' })
}

export function fetchMe() {
  return request('/api/auth/me')
}
