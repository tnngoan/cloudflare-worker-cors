const DEFAULT_ALLOWED_ORIGINS = [
  /^https:\/\/vibrant-art-map\.netlify\.app\/?$/,
  /^http:\/\/localhost:3000\/?$/,
  /^https:\/\/deploy-preview-\d+--vibrant-art-map\.netlify\.app\/?$/,
]

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getAllowedOrigins(env) {
  if (!env?.ALLOWED_ORIGINS) return DEFAULT_ALLOWED_ORIGINS
  const extras = env.ALLOWED_ORIGINS.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((origin) => new RegExp(`^${escapeRegExp(origin)}\\/?$`))
  return [...DEFAULT_ALLOWED_ORIGINS, ...extras]
}

// returns TRUE if the origin is in the allow list
function testCors(origin, env) {
  const allowed = getAllowedOrigins(env)
  return allowed.some((pattern) => pattern.test(origin))
}

function isAllowedUpstream(url, env) {
  if (!env?.ALLOWED_UPSTREAM_HOSTS) return true
  const allowed = env.ALLOWED_UPSTREAM_HOSTS.split(',').map((s) => s.trim())
  try {
    const host = new URL(url).hostname
    return allowed.includes(host)
  } catch {
    return false
  }
}

async function addHeaders(request, responsePromise, env) {
  const originalResponse = await responsePromise
  const response = new Response(originalResponse.body, originalResponse)
  const origin = request.headers.get('Origin')
  if (origin && testCors(origin, env)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.append('Vary', 'Origin')
  }
  return response
}

const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
  'Access-Control-Max-Age': '7200',
}

function handleOptions(request, env) {
  const headers = request.headers
  const origin = headers.get('Origin')

  if (
    origin !== null &&
    headers.get('Access-Control-Request-Method') !== null &&
    headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS pre-flight request.
    const respHeaders = {
      ...corsHeaders,
      'Access-Control-Allow-Headers': headers.get(
        'Access-Control-Request-Headers',
      ),
    }

    if (testCors(origin, env)) {
      respHeaders['Access-Control-Allow-Origin'] = origin
      respHeaders['Access-Control-Allow-Credentials'] = 'true'
      respHeaders['Vary'] = 'Origin'
    }

    return new Response(null, { headers: respHeaders })
  } else {
    // Handle standard OPTIONS request.
    const respHeaders = {
      Allow: 'GET, HEAD, POST, OPTIONS',
    }

    if (origin && testCors(origin, env)) {
      respHeaders['Access-Control-Allow-Origin'] = origin
      respHeaders['Access-Control-Allow-Credentials'] = 'true'
      respHeaders['Vary'] = 'Origin'
    }

    return new Response(null, { headers: respHeaders })
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return handleOptions(request, env)
    }

    if (!isAllowedUpstream(request.url, env)) {
      return new Response('Forbidden', { status: 403 })
    }

    try {
      const response = await addHeaders(request, fetch(request), env)
      return response
    } catch {
      return new Response('Bad Gateway', { status: 502 })
    }
  },
}

export { addHeaders, handleOptions, testCors, isAllowedUpstream }
