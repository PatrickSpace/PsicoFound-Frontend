export const VERIFICATION_RESEND_DELAY_MS = 60000;
const publicHosts = new Set(['app.lurems.lat', 'psico-found-frontend.vercel.app', 'luremsapp.web.app']);
export function verificationActionSettings(origin, emulator = false) {
  let base = 'https://app.lurems.lat';
  try {
    const url = new URL(origin);
    const isPublic = url.protocol === 'https:' && publicHosts.has(url.hostname) && !url.port;
    const isLocal = emulator && url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname);
    if (!url.username && !url.password && (isPublic || isLocal)) base = url.origin;
  } catch { /* Use the canonical public origin. */ }
  const url = new URL('/verificar-correo', base);
  url.searchParams.set('redirect', '/onboarding');
  return { url: url.href, handleCodeInApp: false };
}
export function verificationResendSeconds(lastAttemptAt, now = Date.now()) {
  const timestamp = Number(lastAttemptAt);
  if (!Number.isFinite(timestamp) || timestamp <= 0 || timestamp > now) return 0;
  return Math.max(0, Math.ceil((timestamp + VERIFICATION_RESEND_DELAY_MS - now) / 1000));
}
