addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});
/**
 * Respond with hello worker text
 * @param {Request} request
 */
const defaultData = { text: "Hello World!" };

const setCache = (key, data) => MAPS.put(key, data);
const getCache = (key) => MAPS.get(key);

async function saveData(request) {
  const body = await request.text();
  const ip = request.headers.get("CF-Connecting-IP");
  const myKey = `data-${ip}`;
  try {
    JSON.parse(body);
    await setCache(myKey, body);
    return new Response(body, { status: 200 });
  } catch (err) {
    return new Response(err, { status: 500 });
  }
}

async function readData(request) {
  const ip = request.headers.get("CF-Connecting-IP");
  const myKey = `data-${ip}`;
  let data;
  const cache = await getCache(myKey);
  if (!cache) {
    await setCache(myKey, JSON.stringify(defaultData));
    data = defaultData;
  } else {
    data = JSON.parse(cache);
  }
  const body = JSON.stringify(data.maps || []).replace(/</g, "\\u003c");
  return new Response(body, {
    headers: { "Content-Type": "application/json" },
  });
}

async function handleRequest(request) {
  if (request.method === "PUT") {
    return saveData(request);
  } else {
    return readData(request);
  }
}

export { handleRequest };
