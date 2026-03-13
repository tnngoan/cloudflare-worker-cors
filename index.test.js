import { describe, it, expect } from 'vitest'
import { testCors, addHeaders, handleOptions, isAllowedUpstream } from './index.js'

function makeHeaders(map) {
  return {
    get(key) {
      return map[key] ?? null
    },
  }
}

describe('testCors', () => {
  it('allows the production origin', () => {
    expect(testCors('https://vibrant-art-map.netlify.app')).toBe(true)
    expect(testCors('https://vibrant-art-map.netlify.app/')).toBe(true)
  })

  it('allows localhost:3000', () => {
    expect(testCors('http://localhost:3000')).toBe(true)
    expect(testCors('http://localhost:3000/')).toBe(true)
  })

  it('allows deploy preview origins', () => {
    expect(testCors('https://deploy-preview-42--vibrant-art-map.netlify.app')).toBe(true)
    expect(testCors('https://deploy-preview-123--vibrant-art-map.netlify.app/')).toBe(true)
  })

  it('rejects unknown origins', () => {
    expect(testCors('https://evil.com')).toBe(false)
    expect(testCors('https://vibrant-art-map.netlify.app.evil.com')).toBe(false)
    expect(testCors('http://localhost:4000')).toBe(false)
  })

  it('allows extra origins from env.ALLOWED_ORIGINS', () => {
    const env = { ALLOWED_ORIGINS: 'https://extra.example.com, https://another.example.com' }
    expect(testCors('https://extra.example.com', env)).toBe(true)
    expect(testCors('https://extra.example.com/', env)).toBe(true)
    expect(testCors('https://another.example.com', env)).toBe(true)
    expect(testCors('https://not-listed.com', env)).toBe(false)
  })
})

describe('isAllowedUpstream', () => {
  it('allows all when ALLOWED_UPSTREAM_HOSTS is not set', () => {
    expect(isAllowedUpstream('https://api.example.com/data', {})).toBe(true)
    expect(isAllowedUpstream('https://api.example.com/data')).toBe(true)
  })

  it('allows listed hosts', () => {
    const env = { ALLOWED_UPSTREAM_HOSTS: 'api.example.com, cdn.example.com' }
    expect(isAllowedUpstream('https://api.example.com/data', env)).toBe(true)
    expect(isAllowedUpstream('https://cdn.example.com/img.png', env)).toBe(true)
  })

  it('blocks unlisted hosts', () => {
    const env = { ALLOWED_UPSTREAM_HOSTS: 'api.example.com' }
    expect(isAllowedUpstream('https://evil.com/steal', env)).toBe(false)
  })

  it('returns false for invalid URLs', () => {
    const env = { ALLOWED_UPSTREAM_HOSTS: 'api.example.com' }
    expect(isAllowedUpstream('not-a-url', env)).toBe(false)
  })
})

describe('handleOptions', () => {
  it('returns CORS headers for valid preflight request', () => {
    const request = {
      method: 'OPTIONS',
      headers: makeHeaders({
        Origin: 'https://vibrant-art-map.netlify.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      }),
    }

    const response = handleOptions(request)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://vibrant-art-map.netlify.app',
    )
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
      'GET,HEAD,POST,OPTIONS',
    )
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
      'Content-Type',
    )
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(response.headers.get('Vary')).toBe('Origin')
    expect(response.headers.get('Access-Control-Max-Age')).toBe('7200')
  })

  it('does not set Allow-Origin for disallowed origins on preflight', () => {
    const request = {
      method: 'OPTIONS',
      headers: makeHeaders({
        Origin: 'https://evil.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      }),
    }

    const response = handleOptions(request)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull()
  })

  it('returns Allow header for standard OPTIONS request', () => {
    const request = {
      method: 'OPTIONS',
      headers: makeHeaders({ Origin: null }),
    }

    const response = handleOptions(request)
    expect(response.headers.get('Allow')).toBe('GET, HEAD, POST, OPTIONS')
  })
})

describe('addHeaders', () => {
  it('adds CORS headers for allowed origin', async () => {
    const request = {
      headers: makeHeaders({ Origin: 'https://vibrant-art-map.netlify.app' }),
    }
    const mockResponse = new Response('ok', {
      headers: { 'Content-Type': 'text/plain' },
    })

    const response = await addHeaders(request, Promise.resolve(mockResponse))
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://vibrant-art-map.netlify.app',
    )
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(response.headers.get('Vary')).toBe('Origin')
  })

  it('does not add CORS headers for disallowed origin', async () => {
    const request = {
      headers: makeHeaders({ Origin: 'https://evil.com' }),
    }
    const mockResponse = new Response('ok')

    const response = await addHeaders(request, Promise.resolve(mockResponse))
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull()
  })

  it('does not add CORS headers when no origin header', async () => {
    const request = {
      headers: makeHeaders({}),
    }
    const mockResponse = new Response('ok')

    const response = await addHeaders(request, Promise.resolve(mockResponse))
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('preserves existing Vary header from upstream', async () => {
    const request = {
      headers: makeHeaders({ Origin: 'https://vibrant-art-map.netlify.app' }),
    }
    const mockResponse = new Response('ok', {
      headers: { Vary: 'Accept-Encoding' },
    })

    const response = await addHeaders(request, Promise.resolve(mockResponse))
    const vary = response.headers.get('Vary')
    expect(vary).toContain('Accept-Encoding')
    expect(vary).toContain('Origin')
  })
})
