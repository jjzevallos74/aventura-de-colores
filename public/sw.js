// Service worker mínimo: permite instalar la app. Siempre pide la versión más nueva a internet.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
