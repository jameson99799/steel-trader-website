export const MAX_TIMEOUT_MS = 2_147_000_000

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export function pendingRecipientsForResume(contacts, logs) {
  const successful = new Set(
    (logs || []).filter(log => log.status === 'sent').map(log => normalizeEmail(log.contact_email))
  )
  return (contacts || []).filter(contact => !successful.has(normalizeEmail(contact.email)))
}

export function deriveTaskStatus({ sent = 0, failed = 0, paused = false, cancelled = false } = {}) {
  if (paused) return 'paused'
  if (cancelled) return 'cancelled'
  if (failed > 0 && sent > 0) return 'partial'
  if (failed > 0) return 'failed'
  return 'done'
}

export function scheduleWithLongTimeout(callback, targetTime, timers = globalThis) {
  let handle
  const arm = () => {
    const remaining = Math.max(0, Number(targetTime) - Date.now())
    if (remaining <= MAX_TIMEOUT_MS) {
      handle = timers.setTimeout(callback, remaining)
    } else {
      handle = timers.setTimeout(arm, MAX_TIMEOUT_MS)
    }
  }
  arm()
  return { cancel: () => timers.clearTimeout(handle) }
}

export function smtpTransportOptions(account) {
  const port = Number.parseInt(account.smtp_port, 10) || 465
  return {
    host: account.smtp_host,
    port,
    secure: port === 465,
    auth: { user: account.smtp_user, pass: account.smtp_pass },
    tls: { minVersion: 'TLSv1.2' },
    pool: true,
    maxConnections: 2,
    maxMessages: 100
  }
}
