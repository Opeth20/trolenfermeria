/* TrolEnfermería — service worker: guarda la app en el teléfono para que abra rápido y sin internet.
 * La IA (Gemini/Claude) siempre va por internet y nunca se guarda. Al publicar una versión nueva, cambia VERSION. */
const VERSION = 'trolenf-1.7';
const FILES = [
  './', 'index.html', 'styles.css', 'app.js', 'speech.js', 'fx.js', 'manifest.webmanifest',
  'data-malla.js', 'data-preguntas.js', 'data-preguntas2.js', 'data-preguntas3.js', 'data-preguntas4.js', 'data-preguntas5.js', 'data-explica.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // IA y otros sitios: directo a internet
  // La página: primero internet (para recibir versiones nuevas) y, sin conexión, la guardada
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  // Archivos de la app: primero lo guardado (rápido) y se actualiza por detrás
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req, { cache: 'no-cache' }).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
