const CACHE = 'paddock-pilot-offline-v6'
const CORE = [
  './',
  './piper/piper_phonemize.wasm',
  './piper/piper_phonemize.data',
  './piper/ort/ort-wasm-simd-threaded.wasm',
  './piper/ort/ort-wasm-simd-threaded.jsep.wasm',
  './piper/ort/ort-wasm-simd-threaded.jsep.mjs',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('paddock-pilot-offline-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()))
    return response
  })))
})
