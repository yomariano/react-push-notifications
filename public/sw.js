// Service Worker for Push Notifications - React App
const CACHE_NAME = "react-push-notifications-v1";
const urlsToCache = ["/", "/static/js/bundle.js", "/static/css/main.css"];

// Install event - cache resources
self.addEventListener("install", (event) => {
  console.log("Service Worker: Install event");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Service Worker: Caching files");
      return cache.addAll(urlsToCache).catch((error) => {
        console.error("Service Worker: Cache addAll failed", error);
      });
    })
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activate event");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Service Worker: Deleting old cache", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim all clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      if (response) {
        console.log("Service Worker: Serving from cache", event.request.url);
        return response;
      }
      console.log("Service Worker: Fetching from network", event.request.url);
      return fetch(event.request).catch((error) => {
        console.error("Service Worker: Fetch failed", error);
        throw error;
      });
    })
  );
});

// Push event - handle incoming push notifications
self.addEventListener("push", (event) => {
  console.log("Service Worker: Push event received", event);
  
  let notificationData = {
    title: "React Push Test",
    body: "Test notification from React app",
    icon: "/vite.svg",
    badge: "/vite.svg",
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      console.log("Service Worker: Parsed push data", pushData);
      notificationData = {
        title: pushData.title || notificationData.title,
        body: pushData.body || pushData.message || notificationData.body,
        icon: pushData.icon || notificationData.icon,
        badge: pushData.badge || notificationData.badge,
        tag: pushData.tag || "react-push-notification",
        data: pushData.data || {},
      };
    } catch (error) {
      console.warn("Service Worker: Failed to parse push data as JSON", error);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // Notification options
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    data: {
      url: "/",
      timestamp: Date.now(),
      ...notificationData.data,
    },
    actions: [
      {
        action: "open",
        title: "Open App",
        icon: "/vite.svg",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
  };

  console.log("Service Worker: Showing notification", notificationData.title, options);

  event.waitUntil(
    self.registration
      .showNotification(notificationData.title, options)
      .then(() => {
        console.log("Service Worker: Notification shown successfully");
      })
      .catch((error) => {
        console.error("Service Worker: Error showing notification", error);
        // Fallback: show simple notification
        return self.registration.showNotification(notificationData.title, {
          body: notificationData.body,
          icon: notificationData.icon,
        });
      })
  );
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("Service Worker: Notification clicked", event);

  // Close the notification
  event.notification.close();

  // Handle action clicks
  if (event.action === "dismiss") {
    console.log("Service Worker: Notification dismissed");
    return;
  }

  // Get URL to open (default to root)
  const urlToOpen = event.notification.data?.url || "/";
  
  console.log("Service Worker: Opening URL", urlToOpen);

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        console.log("Service Worker: Found clients", clientList.length);
        
        // Check if app is already open
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            console.log("Service Worker: Focusing existing client");
            return client.focus();
          }
        }

        // Open new window/tab if app not open
        if (clients.openWindow) {
          console.log("Service Worker: Opening new window");
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((error) => {
        console.error("Service Worker: Error handling notification click", error);
      })
  );
});

// Background sync event (future enhancement)
self.addEventListener("sync", (event) => {
  console.log("Service Worker: Background sync event", event.tag);
  
  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync());
  }
});

// Background sync implementation
function doBackgroundSync() {
  console.log("Service Worker: Performing background sync");
  // Handle any pending actions when coming back online
  return Promise.resolve();
}

// Error handling
self.addEventListener("error", (event) => {
  console.error("Service Worker: Global error", event.error);
});

// Unhandled promise rejections
self.addEventListener("unhandledrejection", (event) => {
  console.error("Service Worker: Unhandled promise rejection", event.reason);
});

console.log("Service Worker: Script loaded successfully");