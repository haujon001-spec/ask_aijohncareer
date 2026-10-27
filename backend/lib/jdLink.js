import { sanitizeEmployerSlug, sanitizeRoleSlug } from './jdNaming.js';

/**
 * Read a job posting from a LinkedIn job link (27 Oct 2026).
 *
 * Deliberately credential-free: it only reads the PUBLIC job page that LinkedIn
 * serves to anyone, and never logs in. The page that gets fetched is always
 * rebuilt from the numeric job id (https://www.linkedin.com/jobs/view/<id>/), so
 * the user-supplied link can never choose the host that this server connects to.
 */

const FETCH_TIMEOUT_MS = 15000;
const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_SHORTLINK_HOPS = 3;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export class LinkError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'LinkError';
    this.statusCode = statusCode;
  }
}

const isLinkedInHost = (host) => host === 'linkedin.com' || host.endsWith('.linkedin.com');
const isShortLinkHost = (host) => host === 'lnkd.in' || host === 'www.lnkd.in';

function parseHttpUrl(input) {
  let url;
  try {
    url = new URL(String(input || '').trim());
  } catch {
    throw new LinkError('That does not look like a valid link');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new LinkError('Only http(s) links are supported');
  }
  return url;
}

function jobIdFromUrl(url) {
  const fromPath = url.pathname.match(/\/jobs\/view\/(?:[^/]*-)?(\d{6,15})(?:\/|$)/);
  if (fromPath) return fromPath[1];
  const fromQuery = url.searchParams.get('currentJobId');
  return fromQuery && /^\d{6,15}$/.test(fromQuery) ? fromQuery : null;
}

/**
 * Accepts a full LinkedIn job link (any country subdomain, with or without the
 * title slug / tracking parameters, or a collections link with ?currentJobId=)
 * or a lnkd.in share short-link, and returns the numeric job id.
 */
export async function resolveLinkedInJobId(input, { fetchImpl = fetch } = {}) {
  let url = parseHttpUrl(input);

  // userinfo ("https://www.linkedin.com@evil.com/") and look-alike hosts fail this check
  for (let hop = 0; isShortLinkHost(url.hostname) && hop < MAX_SHORTLINK_HOPS; hop++) {
    const resp = await fetchImpl(url.toString(), {
      redirect: 'manual',
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }).catch(() => null);
    const location = resp?.headers?.get('location');
    if (!location) throw new LinkError('Could not open that short link — paste the full linkedin.com job link instead');
    url = parseHttpUrl(new URL(location, url).toString());
  }

  if (!isLinkedInHost(url.hostname)) {
    throw new LinkError('Only LinkedIn job links are supported. For other sites, paste the text or use screenshots.');
  }
  const id = jobIdFromUrl(url);
  if (!id) {
    throw new LinkError('No job id found in that link. Open the job on LinkedIn, tap Share → Copy link, and paste that.');
  }
  return id;
}

// ── HTML → text ──────────────────────────────────────────────────────────────

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', bull: '•' };

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body) => {
    if (body[0] === '#') {
      const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

export function htmlFragmentToText(fragment) {
  const text = fragment
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div|h[1-6]|ul|ol|section)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(text)
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function firstMatch(html, regex) {
  const m = html.match(regex);
  return m ? htmlFragmentToText(m[1]).replace(/\s+/g, ' ').trim() : '';
}

export function parseLinkedInJobHtml(html) {
  const title = firstMatch(html, /<h1[^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  const company = firstMatch(html, /<a[^>]*class="[^"]*topcard__org-name-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
  const location = firstMatch(html, /<span[^>]*class="[^"]*topcard__flavor--bullet[^"]*"[^>]*>([\s\S]*?)<\/span>/i);

  const start = html.search(/<div[^>]*class="[^"]*show-more-less-html__markup[^"]*"[^>]*>/i);
  let description = '';
  if (start !== -1) {
    const afterOpen = html.indexOf('>', start) + 1;
    const end = html.indexOf('</section>', afterOpen);
    const block = html.slice(afterOpen, end === -1 ? afterOpen + 200000 : end);
    description = htmlFragmentToText(block.replace(/<\/div>\s*$/i, ''));
  }

  const closed = /No longer accepting applications|This job is no longer available/i.test(html);
  return { title, company, location, description, closed };
}

// ── fetch ────────────────────────────────────────────────────────────────────

export async function fetchLinkedInJob(input, { fetchImpl = fetch } = {}) {
  const id = await resolveLinkedInJobId(input, { fetchImpl });
  const pageUrl = `https://www.linkedin.com/jobs/view/${id}/`;

  let resp;
  try {
    resp = await fetchImpl(pageUrl, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9', Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    throw new LinkError(`Could not reach LinkedIn (${err.name === 'TimeoutError' ? 'timed out' : err.message}). Try again, or use screenshots.`, 502);
  }

  const blockedHint = 'LinkedIn did not give this server the job page — it blocks most cloud servers, so link reading works from the laptop portal (npm run dev:lan) but usually not from the live site. Paste the link in the laptop portal, or use screenshots / paste the text here.';
  if (resp.status === 404 || resp.status === 410) throw new LinkError('LinkedIn says this job no longer exists.', 404);
  if (resp.status === 429 || resp.status === 999 || resp.status === 403) throw new LinkError(blockedHint, 502);
  if (!resp.ok) throw new LinkError(`LinkedIn returned HTTP ${resp.status}. ${blockedHint}`, 502);

  // A login wall comes back as a redirect to a sign-in page rather than an error code.
  const finalHost = (() => { try { return new URL(resp.url).hostname; } catch { return ''; } })();
  if (resp.url && (!isLinkedInHost(finalHost) || /\/(authwall|login|checkpoint|uas)\b/i.test(resp.url))) {
    throw new LinkError(blockedHint, 502);
  }

  const html = await resp.text();
  if (html.length > MAX_HTML_BYTES) throw new LinkError('The job page was unexpectedly large; use screenshots instead.', 502);

  const { title, company, location, description, closed } = parseLinkedInJobHtml(html);
  if (description.length < 80) {
    throw new LinkError('Could not find the job description on that page (LinkedIn may have changed the page, or served a sign-in page). Use screenshots or paste the text instead.', 502);
  }

  const notes = [];
  if (closed) notes.push('LinkedIn marks this job as no longer accepting applications.');
  if (!title) notes.push('The job title could not be read — please fill in the Role.');
  if (!company) notes.push('The company name could not be read — please fill in the Employer.');

  const header = [title, [company, location].filter(Boolean).join(' · ')].filter(Boolean).join('\n');
  return {
    source: 'link',
    employer: sanitizeEmployerSlug(company),
    role: sanitizeRoleSlug(title),
    jdText: header ? `${header}\n\n${description}` : description,
    notes,
    jobId: id,
  };
}
