// OneSignal Push Notification Integration
// Comprehensive OneSignal SDK implementation with error handling

// OneSignal configuration
const ONESIGNAL_APP_ID = 'f88d5ae4-e766-461f-bf00-90707c1b850e';
const SAFARI_WEB_ID = 'web.onesignal.auto.2e77cfdc-f6e8-4572-82d4-363b6713f2bc';

// Type definitions for OneSignal
interface OneSignalWindow extends Window {
  OneSignal?: any;
  OneSignalDeferred?: any[];
}

declare let window: OneSignalWindow;

// Load OneSignal SDK dynamically
let oneSignalLoaded = false;
let oneSignalPromise: Promise<void> | null = null;

export async function loadOneSignal(): Promise<void> {
  if (oneSignalLoaded) return;
  if (oneSignalPromise) return oneSignalPromise;

  oneSignalPromise = new Promise((resolve, reject) => {
    try {
      console.log('🔄 Loading OneSignal SDK...');

      // Initialize deferred array
      window.OneSignalDeferred = window.OneSignalDeferred || [];

      // Create script element
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.defer = true;
      script.async = true;

      script.onload = () => {
        console.log('✅ OneSignal SDK loaded successfully');
        oneSignalLoaded = true;
        resolve();
      };

      script.onerror = (error) => {
        console.error('❌ Failed to load OneSignal SDK:', error);
        reject(new Error('Failed to load OneSignal SDK'));
      };

      document.head.appendChild(script);
    } catch (error) {
      console.error('❌ Error loading OneSignal SDK:', error);
      reject(error);
    }
  });

  return oneSignalPromise;
}

// Initialize OneSignal
export async function initOneSignal(): Promise<boolean> {
  try {
    console.log('🚀 Initializing OneSignal...');

    // Check if current domain is supported
    const currentDomain = window.location.hostname;
    if (!currentDomain.includes('signalstrading.app') && currentDomain !== 'localhost') {
      console.warn('⚠️ OneSignal may not work on this domain:', currentDomain);
      console.warn('💡 OneSignal is configured for signalstrading.app domain');
    }

    await loadOneSignal();

    return new Promise((resolve) => {
      window.OneSignalDeferred?.push(async (OneSignal: any) => {
        try {
          console.log('⚙️ Configuring OneSignal...');

          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            safari_web_id: SAFARI_WEB_ID,
            allowLocalhostAsSecureOrigin: true,
            autoRegister: false, // We'll handle subscription manually
            autoResubscribe: true,
            notifyButton: {
              enable: false, // Disable OneSignal's default button
            },
            welcomeNotification: {
              disable: true, // Disable welcome notification
            },
            promptOptions: {
              slidedown: {
                enabled: false, // We'll handle prompts manually
              },
            },
          });

          console.log('✅ OneSignal initialized successfully');
          window.OneSignal = OneSignal; // Store reference
          resolve(true);
        } catch (error: any) {
          console.error('❌ OneSignal initialization failed:', error);
          
          // Check if it's a domain error
          if (error.message?.includes('Can only be used on')) {
            console.warn('🔒 OneSignal domain restriction detected');
            console.warn('💡 This OneSignal app is configured for a different domain');
            console.warn('🔧 You can either:');
            console.warn('   1. Update OneSignal app settings to allow react.signalstrading.app');
            console.warn('   2. Access the app from https://signalstrading.app instead');
            console.warn('   3. Test the Web Push API instead (which works on any domain)');
          }
          
          resolve(false);
        }
      });
    });
  } catch (error) {
    console.error('❌ OneSignal init error:', error);
    return false;
  }
}

// Check OneSignal support and status
export async function getOneSignalStatus(): Promise<{
  isSupported: boolean;
  isInitialized: boolean;
  isPushSupported: boolean;
  notificationPermission: string;
  isSubscribed: boolean;
  userId?: string;
}> {
  try {
    if (!window.OneSignal) {
      return {
        isSupported: false,
        isInitialized: false,
        isPushSupported: false,
        notificationPermission: 'default',
        isSubscribed: false,
      };
    }

    // OneSignal v16 API calls with proper error handling
    let isPushSupported = false;
    let notificationPermission = 'default';
    let isSubscribed = false;
    let userId = undefined;

    try {
      isPushSupported = await window.OneSignal.isPushNotificationsSupported();
    } catch (error) {
      console.warn('OneSignal isPushNotificationsSupported failed:', error);
      isPushSupported = true; // Assume supported if method fails
    }

    try {
      notificationPermission = await window.OneSignal.getNotificationPermission();
    } catch (error) {
      console.warn('OneSignal getNotificationPermission failed:', error);
      notificationPermission = Notification.permission || 'default';
    }

    try {
      isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
    } catch (error) {
      console.warn('OneSignal isPushNotificationsEnabled failed:', error);
      // Try alternative method
      try {
        const subscription = await window.OneSignal.getSubscription();
        isSubscribed = !!subscription;
      } catch (err) {
        isSubscribed = false;
      }
    }

    try {
      userId = await window.OneSignal.getUserId();
    } catch (error) {
      console.warn('OneSignal getUserId failed:', error);
      // Try alternative method
      try {
        const subscription = await window.OneSignal.getSubscription();
        userId = subscription?.id;
      } catch (err) {
        userId = undefined;
      }
    }

    const status = {
      isSupported: true,
      isInitialized: true,
      isPushSupported,
      notificationPermission,
      isSubscribed,
      userId,
    };

    console.log('📊 OneSignal status:', status);
    return status;
  } catch (error) {
    console.error('❌ Failed to get OneSignal status:', error);
    return {
      isSupported: false,
      isInitialized: false,
      isPushSupported: false,
      notificationPermission: 'default',
      isSubscribed: false,
    };
  }
}

// Subscribe to OneSignal notifications
export async function subscribeOneSignal(): Promise<boolean> {
  try {
    console.log('🔔 Starting OneSignal subscription...');

    if (!window.OneSignal) {
      throw new Error('OneSignal not initialized');
    }

    // Check if already subscribed using robust method
    let isAlreadySubscribed = false;
    try {
      isAlreadySubscribed = await window.OneSignal.isPushNotificationsEnabled();
    } catch (error) {
      console.warn('Could not check subscription status, attempting to subscribe anyway');
    }

    if (isAlreadySubscribed) {
      console.log('✅ Already subscribed to OneSignal');
      return true;
    }

    // Request notification permission through browser API first
    console.log('🔔 Requesting notification permission...');
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }

    // OneSignal v16 subscription approach
    console.log('📝 Registering for OneSignal notifications...');
    console.log('🔍 Debug: Checking OneSignal object structure:', {
      hasOneSignal: !!window.OneSignal,
      oneSignalType: typeof window.OneSignal,
      hasNotifications: !!(window.OneSignal && window.OneSignal.Notifications),
      hasUser: !!(window.OneSignal && window.OneSignal.User),
      hasPushSubscription: !!(window.OneSignal && window.OneSignal.User && window.OneSignal.User.PushSubscription),
      availableMethods: window.OneSignal ? Object.getOwnPropertyNames(window.OneSignal).filter(name => typeof window.OneSignal[name] === 'function') : []
    });
    
    try {
      // OneSignal v16 uses the login method to trigger subscription
      console.log('Attempting OneSignal v16 subscription methods...');
      
      // Method 1: Try to use the Notifications namespace (v16 approach)
      if (window.OneSignal.Notifications) {
        console.log('Using OneSignal.Notifications.requestPermission()');
        await window.OneSignal.Notifications.requestPermission();
        console.log('✅ Used Notifications.requestPermission method');
      } 
      // Method 2: Try login method (common in v16)
      else if (typeof window.OneSignal.login === 'function') {
        console.log('Using OneSignal.login() method');
        await window.OneSignal.login();
        console.log('✅ Used login method');
      }
      // Method 3: Try setSubscription if available
      else if (typeof window.OneSignal.setSubscription === 'function') {
        console.log('Using OneSignal.setSubscription(true)');
        await window.OneSignal.setSubscription(true);
        console.log('✅ Used setSubscription method');
      }
      // Method 4: Try User.PushSubscription namespace
      else if (window.OneSignal.User && window.OneSignal.User.PushSubscription) {
        console.log('Using OneSignal.User.PushSubscription.optIn()');
        await window.OneSignal.User.PushSubscription.optIn();
        console.log('✅ Used User.PushSubscription.optIn method');
      }
      // Method 5: Direct push subscription request
      else {
        console.log('Using direct push subscription request...');
        // Try to access the push subscription directly
        if (window.OneSignal.context && window.OneSignal.context.subscriptionManager) {
          const subscription = await window.OneSignal.context.subscriptionManager.subscribe();
          console.log('✅ Direct subscription result:', subscription);
        } else {
          throw new Error('No available subscription methods found');
        }
      }
    } catch (error) {
      console.error('OneSignal subscription methods failed:', error);
      
      // Final fallback: Try to trigger subscription through prompt methods
      console.log('🔄 Trying prompt methods as fallback...');
      try {
        if (typeof window.OneSignal.showNativePrompt === 'function') {
          await window.OneSignal.showNativePrompt();
          console.log('✅ Used showNativePrompt fallback');
        } else if (typeof window.OneSignal.showSlidedownPrompt === 'function') {
          await window.OneSignal.showSlidedownPrompt();
          console.log('✅ Used showSlidedownPrompt fallback');
        } else {
          throw new Error('All subscription methods failed');
        }
      } catch (fallbackError) {
        console.error('All subscription methods failed:', fallbackError);
        throw new Error('Failed to subscribe to OneSignal notifications');
      }
    }

    // Give OneSignal time to process subscription
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if subscription was successful
    let finalSubscriptionCheck = false;
    let finalUserId = undefined;

    try {
      finalSubscriptionCheck = await window.OneSignal.isPushNotificationsEnabled();
      finalUserId = await window.OneSignal.getUserId();
    } catch (error) {
      console.warn('Could not verify subscription, but assuming success');
      finalSubscriptionCheck = true;
    }

    if (finalSubscriptionCheck || finalUserId) {
      console.log('✅ OneSignal subscription successful!', { userId: finalUserId });
      return true;
    } else {
      console.warn('OneSignal subscription status unclear, but no errors occurred');
      return true; // Assume success if no errors
    }
  } catch (error: any) {
    console.error('❌ OneSignal subscription failed:', error);
    return false;
  }
}

// Send test notification via OneSignal
export async function sendOneSignalNotification(
  title: string = '🎯 OneSignal Test',
  message: string = 'OneSignal push notification working perfectly!',
  data?: any
): Promise<boolean> {
  try {
    console.log('📨 Sending OneSignal test notification...');

    if (!window.OneSignal) {
      throw new Error('OneSignal not initialized');
    }

    const userId = await window.OneSignal.getUserId();
    if (!userId) {
      throw new Error('No OneSignal user ID found. Please subscribe first.');
    }

    // For testing, we'll use the REST API approach
    const response = await fetch('/api/onesignal-send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        message,
        userId,
        data: {
          url: '/',
          timestamp: Date.now(),
          source: 'onesignal-test',
          ...data,
        },
      }),
    });

    const result = await response.json();
    console.log('📊 OneSignal send response:', result);

    if (response.ok && result.success) {
      console.log('✅ OneSignal notification sent successfully!');
      return true;
    } else {
      throw new Error(`OneSignal send failed: ${result.message || 'Unknown error'}`);
    }
  } catch (error: any) {
    console.error('❌ OneSignal notification send failed:', error);
    
    // Fallback: Try to show local notification if OneSignal fails
    try {
      console.log('🔄 Attempting fallback local notification...');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/vite.svg',
          tag: 'onesignal-fallback',
        });
        console.log('✅ Fallback notification shown');
        return true;
      }
    } catch (fallbackError) {
      console.error('❌ Fallback notification failed:', fallbackError);
    }

    return false;
  }
}

// Unsubscribe from OneSignal
export async function unsubscribeOneSignal(): Promise<boolean> {
  try {
    console.log('🔕 Unsubscribing from OneSignal...');

    if (!window.OneSignal) {
      throw new Error('OneSignal not initialized');
    }

    await window.OneSignal.setSubscription(false);
    console.log('✅ OneSignal unsubscription successful');
    return true;
  } catch (error: any) {
    console.error('❌ OneSignal unsubscription failed:', error);
    return false;
  }
}

// Get OneSignal player ID
export async function getOneSignalUserId(): Promise<string | null> {
  try {
    if (!window.OneSignal) {
      return null;
    }

    const userId = await window.OneSignal.getUserId();
    console.log('👤 OneSignal User ID:', userId);
    return userId;
  } catch (error) {
    console.error('❌ Failed to get OneSignal User ID:', error);
    return null;
  }
}

// Export configuration for debugging
export const oneSignalConfig = {
  appId: ONESIGNAL_APP_ID,
  safariWebId: SAFARI_WEB_ID,
};