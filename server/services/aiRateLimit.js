import http from 'http'
import https from 'https'

// ─── Shared AI RPM limiter (one process-wide window per channel) ────────────
// Keyed by api_key + api_url and shared by EVERY AI-calling route module
// (translation.js, news-enhance.js). Previously each route kept its OWN
// tracker Map, so two routes hitting the same default channel could send
// 2x the configured requests-per-minute to it, while routes without a
// tracker (ai-auto-post) were unlimited.

const rpmTrackers = new Map() // channelKey -> { windowStart, count }
const rpmLoggedAt = new Map() // channelKey -> last console.log timestamp

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// The default AI channel's rpm_limit only overrides the global setting when
// it is actually configured (> 0). A channel without a limit must never
// silently zero out an rpm_limit the admin configured in translation
// settings (and when NO default channel exists at all, the settings value
// stays in force instead of being forced to 0).
export function resolveRpmLimit(settingsLimit, channelLimit) {
    const chLimit = parseInt(channelLimit) || 0
    if (chLimit > 0) return chLimit
    return parseInt(settingsLimit) || 0
}

// Wait until an RPM slot is available for this channel, then consume it.
// The window length comes from translation_settings.rpm_interval (seconds,
// default 60) — ai_channels only stores rpm_limit, the interval is shared
// configuration so honoring it keeps every consumer consistent.
export async function acquireRpmSlot({ key, limit, intervalMs = 60000, logTag = '' }) {
    const parsedLimit = parseInt(limit) || 0
    if (parsedLimit <= 0 || !key) return
    const interval = Math.max(1000, parseInt(intervalMs) || 60000)
    while (true) {
        const now = Date.now()
        let tracker = rpmTrackers.get(key)
        if (!tracker || (now - tracker.windowStart) >= interval) {
            tracker = { windowStart: now, count: 0 }
            rpmTrackers.set(key, tracker)
        }
        if (tracker.count < parsedLimit) {
            tracker.count++
            return
        }
        const waitTime = interval - (now - tracker.windowStart)
        if (waitTime > 0) {
            // Throttle the log so N concurrent callers don't spam the console
            // with one line each per window of waiting.
            if ((rpmLoggedAt.get(key) || 0) < now - interval) {
                rpmLoggedAt.set(key, now)
                console.log(`[RateLimit]${logTag ? ' ' + logTag : ''}: API 请求已达该渠道阈值 (${parsedLimit}次/${Math.round(interval / 1000)}秒)，休眠 ${Math.round(waitTime / 1000)} 秒后重新检查...`)
            }
            await sleep(waitTime + 50)
        } else {
            tracker.windowStart = Date.now()
            tracker.count = 0
        }
    }
}

// Exponential backoff with jitter for AI retries — avoids the thundering
// herd when many parallel workers all retry at the same instant.
// attempt 1 → ~[500, 1500)ms, attempt 2 → ~[1000, 3000)ms, ...
export function retryDelayMs(attempt, baseMs = 500) {
    const expo = (parseInt(baseMs) || 500) * Math.pow(2, Math.max(0, attempt - 1))
    return Math.floor(expo / 2 + Math.random() * expo)
}

// Shared keep-alive HTTP agents. The node http/https fallback path used to
// open a brand-new TCP+TLS connection for EVERY AI call; with 30-40
// concurrent calls to the same API origin that is pure overhead. Node's
// global fetch (undici) already pools and keep-alives connections per
// origin; these agents cover the node-http fallback path and route modules
// that only use node http (news-enhance.js). One shared pool also means
// concurrent calls from BOTH route modules reuse the same sockets.
export const httpAgent = new http.Agent({ keepAlive: true, keepAliveMsecs: 30000, maxSockets: 64 })
export const httpsAgent = new https.Agent({ keepAlive: true, keepAliveMsecs: 30000, maxSockets: 64 })
