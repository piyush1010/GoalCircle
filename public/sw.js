const CACHE_VERSION = 'goalcircle-shell-v2'
const SHELL_ASSETS = ['/', '/login', '/goalyaar-icon-192.png', '/goalyaar-icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('goalcircle-shell-') && key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  // Only cache the public shell. Authenticated pages and API responses remain network-only.
  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)))
  }
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data
  try {
    data = event.data.json()
  } catch {
    data = { body: event.data.text() }
  }
  event.waitUntil(self.registration.showNotification(data.title || 'GoalYaar', {
    body: data.body || 'You have a new GoalYaar update.',
    icon: '/goalyaar-icon-192.png',
    badge: '/goalyaar-icon-192.png',
    tag: data.tag || 'goalcircle-update',
    data: { url: data.url || '/notifications' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destination = event.notification.data?.url || '/notifications'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => new URL(client.url).origin === self.location.origin)
      if (existing) {
        existing.navigate(destination)
        return existing.focus()
      }
      return self.clients.openWindow(destination)
    })
  )
})
