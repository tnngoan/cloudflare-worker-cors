const allowedCORS = [
  /^https:\/\/vibrant-art-map.netlify.app\/?$/,
  /^http:\/\/localhost:3000\/?$/,
  /^https:\/\/deploy-preview-\d+--vibrant-art-map.netlify.app\/?$/,
]
  
// returns TRUE if the request has a valid domain
function testCors(url) {
  return allowedCORS.some(function(element) {
    return url.match(element)
  })
}

async function addHeaders(request, responsePromise) {
  response = await responsePromise
  const origin = request.headers.get('origin')
  if (!!origin && testCors(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
  return response
}

const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function handleOptions(request) {
  // Make sure the necessary headers are present
  // for this to be a valid pre-flight request
  let headers = request.headers
  if (
    headers.get('Origin') !== null &&
    headers.get('Access-Control-Request-Method') !== null &&
    headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS pre-flight request.
    // If you want to check or reject the requested method + headers
    // you can do that here.

    let respHeaders = {
      ...corsHeaders,
      // Allow all future content Request headers to go back to browser
      // such as Authorization (Bearer) or X-Client-Name-Version
      'Access-Control-Allow-Headers': request.headers.get(
        'Access-Control-Request-Headers',
      ),
    }

    return new Response(null, {
      headers: respHeaders,
    })
  } else {
    // Handle standard OPTIONS request.
    // If you want to allow other HTTP Methods, you can do that here.
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, POST, OPTIONS',
      },
    })
  }
}

export { addHeaders,handleOptions };