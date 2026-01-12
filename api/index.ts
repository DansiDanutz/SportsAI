/**
 * Vercel Serverless API entrypoint.
 *
 * IMPORTANT:
 * - Vercel Serverless Functions are not a great fit for long-lived websockets.
 * - This handler provides a simple `/api/health` endpoint and (optionally) proxies
 *   requests to an external backend if `API_PROXY_BASE_URL` is set.
 *
 * Why this exists:
 * - Importing the full NestJS backend here causes Vercel's TypeScript build step to
 *   compile the entire backend (and requires all backend deps + Prisma + DB env vars).
 * - Keeping this handler lightweight makes deployment reliable.
 */

// Keep typings intentionally loose so Vercel can compile this function
// even if it doesn't load Node/DOM typings during its function build step.
declare const Buffer: any
declare const process: any

type VercelRequest = any
type VercelResponse = any

function readBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = []
    req.on('data', (chunk: any) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function normalizeUrl(url: string | undefined): string {
  if (!url) return '/'
  return url.startsWith('/') ? url : `/${url}`
}

function stripHopByHopHeaders(headers: Record<string, any>) {
  // https://www.rfc-editor.org/rfc/rfc2616#section-13.5.1
  const hopByHop = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
    'host',
  ])
  for (const key of Object.keys(headers)) {
    if (hopByHop.has(key.toLowerCase())) delete headers[key]
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = (req.method || 'GET').toUpperCase()
  const url = normalizeUrl(req.url)

  // Health (works for both "/api/health" and "/health" depending on rewrites)
  if (method === 'GET' && (url === '/api/health' || url === '/health')) {
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.statusCode = 200
    res.end(JSON.stringify({ status: 'ok' }))
    return
  }

  const proxyBase = process?.env?.API_PROXY_BASE_URL
  if (!proxyBase) {
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.statusCode = 501
    res.end(
      JSON.stringify({
        error: 'API not configured',
        message:
          'Set API_PROXY_BASE_URL in Vercel Environment Variables to proxy /api/* to a backend.',
      })
    )
    return
  }

  // Proxy request to external backend
  const base = String(proxyBase).replace(/\/+$/, '')
  const upstreamUrl = `${base}${url}`

  // If Vercel rewrite sends /api/* here, keep it as-is. (Most backends expect /api prefix.)
  const headers: Record<string, any> = { ...(req.headers || {}) }
  stripHopByHopHeaders(headers)

  const bodyBuffer =
    method === 'GET' || method === 'HEAD' ? undefined : await readBody(req)

  const upstreamRes = await fetch(upstreamUrl, {
    method,
    headers,
    body: bodyBuffer ? bodyBuffer.toString() : undefined,
    redirect: 'manual',
  })

  res.statusCode = upstreamRes.status
  upstreamRes.headers.forEach((value, key) => {
    // Avoid sending a mismatched content-length if runtime changes encoding
    if (key.toLowerCase() === 'content-length') return
    res.setHeader(key, value)
  })

  const buf = Buffer.from(await upstreamRes.arrayBuffer())
  res.end(buf)
}
