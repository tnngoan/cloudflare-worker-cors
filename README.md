# cloudflare-worker-cors

Easiest way to get CORS working with Cloudflare Workers.

## Setup

```bash
npm install
```

## Configuration

Edit the `allowedCORS` array in `index.js` to specify your allowed origins:

```js
const allowedCORS = [
  /^https:\/\/your-app.netlify.app\/?$/,
  /^http:\/\/localhost:3000\/?$/,
]
```

## Development

```bash
npm run dev
```

## Deploy

```bash
npm run deploy
```

## Usage as a library

You can also import the utilities into another worker:

```js
import { addHeaders, handleOptions, testCors } from './index.js'
```

- `handleOptions(request)` — returns a proper CORS preflight response
- `addHeaders(request, responsePromise)` — clones the response and adds CORS headers
- `testCors(origin)` — returns `true` if the origin is in the allow list

## Testing

```bash
npm test
```

## License

MIT
