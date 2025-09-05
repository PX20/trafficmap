// Service Worker for Push Notifications
const CACHE_NAME = 'safety-app-v1';

// Install event - Cache essential resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event - Take control of all pages
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Push event - Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  if (!event.data) {
    console.log('No push data');
    return;
  }

  const data = event.data.json();
  
  const options = {
    body: data.body || 'New safety incident in your area',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: data.tag || 'safety-incident',
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/action-dismiss.png'
      }
    ],
    data: {
      url: data.url || '/',
      incidentId: data.incidentId,
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Safety Alert',
      options
    )
  );
});

// Notification click event - Handle user interactions
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Default action or 'view' action - open the app
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clients) => {
      // Check if app is already open
      for (const client of clients) {
        if (client.url.includes(urlToOpen.split('?')[0]) && 'focus' in client) {
          client.focus();
          return client.navigate(urlToOpen);
        }
      }
      
      // Open new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync for offline incident reporting
self.addEventListener('sync', (event) => {
  if (event.tag === 'incident-report') {
    event.waitUntil(syncIncidentReports());
  }
});

async function syncIncidentReports() {
  // Handle offline incident reports when connection is restored
  try {
    const cache = await caches.open(CACHE_NAME);
    const pendingReports = await cache.match('pending-reports');
    
    if (pendingReports) {
      const reports = await pendingReports.json();
      // Process pending reports...
      console.log('Syncing pending incident reports:', reports);
    }
  } catch (error) {
    console.error('Error syncing incident reports:', error);
  }
}