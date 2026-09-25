/* Service worker di FlowGTD.
   VERSION cambia a ogni build: al primo caricamento con rete la pagina nuova
   sostituisce quella in cache, cosi' non resti bloccato su una versione vecchia. */
const VERSION = 'flowgtd-33';
const CORE = ['./', './index.html', './manifest.webmanifest',
              './icon-192.png?v=30', './icon-512.png?v=30', './icon-maskable-512.png?v=30', './apple-touch-icon.png?v=30'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* Cosa si mette in cache e cosa no:
   - la pagina: prima la rete (per gli aggiornamenti), la cache se non c'e' rete;
   - file dell'app, SDK Firebase e font: dalla cache, aggiornandoli in sottofondo;
   - tutto il resto, Firestore compreso, passa senza essere toccato. */
const CACHEABLE = /^https:\/\/(www\.gstatic\.com\/firebasejs|fonts\.googleapis\.com|fonts\.gstatic\.com)/;

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req)
      .then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return r; })
      .catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  if (!sameOrigin && !CACHEABLE.test(req.url)) return;

  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => {
      if (r && (r.ok || r.type === 'opaque')) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return r;
    }).catch(() => hit);
    return hit || net;
  }));
});
