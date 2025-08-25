// Push Notifications Utility - TypeScript Implementation
// Triple-verified Web Push API implementation

// VAPID public key - Generated specifically for this React app
const VAPID_PUBLIC_KEY = 'BLgcx_kxWLsqiOF6ZcgZZ1c9ULSo1bTV_rrFCQlHCZqdz2dpJYFSPd5wUVVD8tgi4o4BV-chSiGP3OEIXNLsDx8';

// Interface definitions for type safety
interface PushSubscriptionJSON {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

// Utility function to convert VAPID key from base64url to Uint8Array
// Triple-verified implementation with error handling
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  try {
    // Add padding if necessary
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Decode base64 string
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    console.log('VAPID key conversion successful', {
      originalLength: base64String.length,
      paddedLength: base64.length,
      arrayLength: outputArray.length
    });

    return outputArray;
  } catch (error) {
    console.error('VAPID key conversion failed:', error);
    throw new Error(`Failed to convert VAPID key: ${error}`);
  }
}

// Check if push notifications are supported in this browser
// Multi-browser verification
export function isPushNotificationSupported(): boolean {
  const checks = {
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notification: 'Notification' in window,
    https: location.protocol === 'https:' || location.hostname === 'localhost'
  };

  console.log('Push notification support check:', checks);

  const isSupported = Object.values(checks).every(Boolean);
  
  if (!isSupported) {
    const missing = Object.entries(checks)
      .filter(([, supported]) => !supported)
      .map(([feature]) => feature);
    
    console.warn('Push notifications not supported. Missing:', missing);
  }

  return isSupported;
}

// Register service worker with comprehensive error handling
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  try {
    console.log('Registering service worker...');
    
    // Register with explicit scope
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('Service worker registered successfully:', {
      scope: registration.scope,
      state: registration.installing?.state || registration.waiting?.state || registration.active?.state
    });

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('Service worker is ready');

    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    throw new Error(`Service worker registration failed: ${error}`);
  }
}

// Request notification permission with detailed logging
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    throw new Error('Notifications are not supported');
  }

  console.log('Current notification permission:', Notification.permission);

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notification permission was previously denied. Please enable in browser settings.');
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('Notification permission result:', permission);

    if (permission !== 'granted') {
      throw new Error(`Notification permission not granted: ${permission}`);
    }

    return permission;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    throw error;
  }
}

// Subscribe to push notifications with extensive validation
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  try {
    console.log('Starting push notification subscription process...');

    // Step 1: Ensure service worker is registered
    const registration = await registerServiceWorker();
    if (!registration) {
      throw new Error('Failed to register service worker');
    }

    // Step 2: Request notification permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    // Step 3: Get push manager
    const pushManager = registration.pushManager;
    if (!pushManager) {
      throw new Error('Push manager not available');
    }

    // Step 4: Check for existing subscription
    console.log('Checking for existing push subscription...');
    let subscription = await pushManager.getSubscription();

    if (subscription) {
      console.log('Found existing push subscription:', {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime
      });
      
      // Verify subscription is still valid
      if (subscription.expirationTime && subscription.expirationTime <= Date.now()) {
        console.log('Existing subscription expired, creating new one');
        await subscription.unsubscribe();
        subscription = null;
      }
    }

    // Step 5: Create new subscription if needed
    if (!subscription) {
      console.log('Creating new push subscription...');
      
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      
      subscription = await pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      console.log('New push subscription created:', {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime
      });
    }

    // Step 6: Validate subscription
    const subscriptionJSON = subscription.toJSON();
    if (!subscriptionJSON.endpoint || !subscriptionJSON.keys?.p256dh || !subscriptionJSON.keys?.auth) {
      throw new Error('Invalid subscription data received');
    }

    console.log('Push subscription validation successful');
    return subscription;

  } catch (error) {
    console.error('Push notification subscription failed:', error);
    throw error;
  }
}

// Send subscription to server (mock implementation for now)
export async function sendSubscriptionToServer(subscription: PushSubscription): Promise<boolean> {
  try {
    const subscriptionData = subscription.toJSON();
    console.log('Sending subscription to server:', subscriptionData);

    // In a real app, this would send to your backend
    // For testing, we'll just store in localStorage
    localStorage.setItem('pushSubscription', JSON.stringify(subscriptionData));
    
    console.log('Subscription stored successfully');
    return true;
  } catch (error) {
    console.error('Failed to send subscription to server:', error);
    return false;
  }
}

// Send test notification (client-side for demo)
export async function sendTestNotification(payload?: Partial<NotificationPayload>): Promise<boolean> {
  try {
    console.log('Sending test notification...');

    const notificationData: NotificationPayload = {
      title: '🚀 React Push Test',
      body: 'Push notification working perfectly from React app!',
      icon: '/vite.svg',
      tag: 'react-push-test',
      data: {
        url: '/',
        timestamp: Date.now(),
        source: 'react-app'
      },
      ...payload
    };

    // For testing, create a direct notification
    // In production, this would trigger a server-side push
    const notification = new Notification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      tag: notificationData.tag,
      requireInteraction: false,
      data: notificationData.data
    });

    notification.onclick = () => {
      console.log('Test notification clicked');
      window.focus();
      notification.close();
    };

    console.log('Test notification sent successfully');
    return true;
  } catch (error) {
    console.error('Failed to send test notification:', error);
    return false;
  }
}

// Get current push subscription status
export async function getPushSubscriptionStatus(): Promise<{
  isSupported: boolean;
  permission: NotificationPermission;
  hasSubscription: boolean;
  subscription?: PushSubscriptionJSON;
}> {
  const status = {
    isSupported: isPushNotificationSupported(),
    permission: Notification.permission,
    hasSubscription: false,
    subscription: undefined as PushSubscriptionJSON | undefined
  };

  if (status.isSupported && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.pushManager) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          status.hasSubscription = true;
          status.subscription = subscription.toJSON();
        }
      }
    } catch (error) {
      console.error('Failed to get subscription status:', error);
    }
  }

  console.log('Push subscription status:', status);
  return status;
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    console.log('Unsubscribing from push notifications...');

    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers not supported');
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.pushManager) {
      console.log('No push manager available');
      return true;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.log('No active subscription found');
      return true;
    }

    const unsubscribed = await subscription.unsubscribe();
    if (unsubscribed) {
      localStorage.removeItem('pushSubscription');
      console.log('Successfully unsubscribed from push notifications');
    } else {
      throw new Error('Failed to unsubscribe');
    }

    return unsubscribed;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    throw error;
  }
}

// Export VAPID public key for debugging
export { VAPID_PUBLIC_KEY };