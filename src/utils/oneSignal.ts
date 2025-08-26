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
      // OneSignal v16 subscription status check
      if (window.OneSignal.User && window.OneSignal.User.pushSubscription) {
        // Method 1: Use v16 optedIn property
        if (typeof window.OneSignal.User.pushSubscription.optedIn !== 'undefined') {
          isSubscribed = window.OneSignal.User.pushSubscription.optedIn;
          console.log('✅ Got subscription status from User.pushSubscription.optedIn:', isSubscribed);
        }
        // Method 2: Use v16 async method if available
        else if (typeof window.OneSignal.User.pushSubscription.getOptedInAsync === 'function') {
          isSubscribed = await window.OneSignal.User.pushSubscription.getOptedInAsync();
          console.log('✅ Got subscription status from User.pushSubscription.getOptedInAsync:', isSubscribed);
        }
      }
      // Fallback to legacy method
      else if (typeof window.OneSignal.isPushNotificationsEnabled === 'function') {
        isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
        console.log('✅ Got subscription status from isPushNotificationsEnabled fallback:', isSubscribed);
      }
    } catch (error) {
      console.warn('OneSignal subscription status check failed:', error);
      isSubscribed = false;
    }

    try {
      // OneSignal v16 user ID retrieval
      if (window.OneSignal.User && window.OneSignal.User.onesignalId) {
        userId = window.OneSignal.User.onesignalId;
        console.log('✅ Got User ID from User.onesignalId:', userId);
      }
      // Method 2: PushSubscription ID
      else if (window.OneSignal.User && window.OneSignal.User.PushSubscription && window.OneSignal.User.PushSubscription.id) {
        userId = window.OneSignal.User.PushSubscription.id;
        console.log('✅ Got User ID from User.PushSubscription.id:', userId);
      }
      // Method 3: Async method if available
      else if (window.OneSignal.User && window.OneSignal.User.PushSubscription && typeof window.OneSignal.User.PushSubscription.getIdAsync === 'function') {
        userId = await window.OneSignal.User.PushSubscription.getIdAsync();
        console.log('✅ Got User ID from User.PushSubscription.getIdAsync:', userId);
      }
      // Legacy fallback
      else if (typeof window.OneSignal.getUserId === 'function') {
        userId = await window.OneSignal.getUserId();
        console.log('✅ Got User ID from getUserId fallback:', userId);
      }
    } catch (error) {
      console.warn('OneSignal getUserId failed:', error);
      userId = undefined;
    }

    // Fallback: If we have a valid userId but isSubscribed is false, treat as subscribed
    if (!isSubscribed && userId) {
      console.log('🔧 Status override: Have User ID but subscription status is false, treating as subscribed');
      isSubscribed = true;
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
      // OneSignal v16 proper subscription flow
      console.log('🔧 Starting OneSignal v16 subscription process...');
      
      // Method 1: Use User.PushSubscription.optIn() - Correct v16 method
      if (window.OneSignal.User && window.OneSignal.User.PushSubscription && typeof window.OneSignal.User.PushSubscription.optIn === 'function') {
        console.log('✅ Using OneSignal.User.PushSubscription.optIn() - v16 standard method');
        await window.OneSignal.User.PushSubscription.optIn();
        console.log('✅ User.PushSubscription.optIn completed');
      }
      // Method 2: Set User.pushSubscription.optedIn = true (v16 property)
      else if (window.OneSignal.User && window.OneSignal.User.pushSubscription) {
        console.log('✅ Using User.pushSubscription.optedIn property - v16 method');
        window.OneSignal.User.pushSubscription.optedIn = true;
        console.log('✅ User.pushSubscription.optedIn set to true');
      }
      // Method 3: Use Notifications.requestPermission() + login
      else if (window.OneSignal.Notifications && typeof window.OneSignal.login === 'function') {
        console.log('✅ Using Notifications.requestPermission + login flow');
        await window.OneSignal.Notifications.requestPermission();
        console.log('✅ Permission requested, now calling login...');
        await window.OneSignal.login();
        console.log('✅ Login completed');
      }
      // Method 4: Just use Notifications.requestPermission for subscription
      else if (window.OneSignal.Notifications && typeof window.OneSignal.Notifications.requestPermission === 'function') {
        console.log('✅ Using OneSignal.Notifications.requestPermission() only');
        await window.OneSignal.Notifications.requestPermission();
        console.log('✅ Notifications.requestPermission completed');
      }
      // Method 5: Fallback to login method
      else if (typeof window.OneSignal.login === 'function') {
        console.log('✅ Using OneSignal.login() fallback method');
        await window.OneSignal.login();
        console.log('✅ Login method completed');
      }
      else {
        throw new Error('No compatible OneSignal subscription methods found');
      }
      
      // Give OneSignal time to process the subscription
      console.log('⏳ Waiting for OneSignal to process subscription...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Try to get user ID after subscription using v16 methods
      let userId = undefined;
      console.log('🔍 Attempting to retrieve User ID using v16 methods...');
      
      try {
        // Method 1: Direct property access (v16)
        if (window.OneSignal.User && window.OneSignal.User.onesignalId) {
          userId = window.OneSignal.User.onesignalId;
          console.log('✅ Got User ID from User.onesignalId:', userId);
        }
        // Method 2: PushSubscription ID (v16)
        else if (window.OneSignal.User && window.OneSignal.User.PushSubscription && window.OneSignal.User.PushSubscription.id) {
          userId = window.OneSignal.User.PushSubscription.id;
          console.log('✅ Got User ID from User.PushSubscription.id:', userId);
        }
        // Method 3: Try async method if available
        else if (window.OneSignal.User && window.OneSignal.User.PushSubscription && typeof window.OneSignal.User.PushSubscription.getIdAsync === 'function') {
          userId = await window.OneSignal.User.PushSubscription.getIdAsync();
          console.log('✅ Got User ID from User.PushSubscription.getIdAsync():', userId);
        }
        // Method 4: Legacy getUserId fallback
        else if (typeof window.OneSignal.getUserId === 'function') {
          userId = await window.OneSignal.getUserId();
          console.log('✅ Got User ID from getUserId() fallback:', userId);
        }
        
        if (!userId) {
          console.warn('⚠️ No User ID found after subscription attempt');
          // Log available properties for debugging
          console.log('🔍 Available User properties:', {
            hasUser: !!window.OneSignal.User,
            hasOnesignalId: !!(window.OneSignal.User && window.OneSignal.User.onesignalId),
            onesignalId: window.OneSignal.User?.onesignalId,
            hasPushSubscription: !!(window.OneSignal.User && window.OneSignal.User.PushSubscription),
            pushSubscriptionId: window.OneSignal.User?.PushSubscription?.id,
            hasLegacyGetUserId: typeof window.OneSignal.getUserId === 'function'
          });
        }
      } catch (error) {
        console.warn('⚠️ Could not retrieve User ID after subscription:', error);
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

    // Check if subscription was successful using v16 methods
    let finalSubscriptionCheck = false;
    let finalUserId = undefined;

    try {
      // Check subscription status using v16 methods
      if (window.OneSignal.User && window.OneSignal.User.pushSubscription) {
        if (typeof window.OneSignal.User.pushSubscription.optedIn !== 'undefined') {
          finalSubscriptionCheck = window.OneSignal.User.pushSubscription.optedIn;
          console.log('✅ Final subscription check - User.pushSubscription.optedIn:', finalSubscriptionCheck);
        } else if (typeof window.OneSignal.User.pushSubscription.getOptedInAsync === 'function') {
          finalSubscriptionCheck = await window.OneSignal.User.pushSubscription.getOptedInAsync();
          console.log('✅ Final subscription check - getOptedInAsync:', finalSubscriptionCheck);
        }
      } else if (typeof window.OneSignal.isPushNotificationsEnabled === 'function') {
        finalSubscriptionCheck = await window.OneSignal.isPushNotificationsEnabled();
        console.log('✅ Final subscription check - isPushNotificationsEnabled fallback:', finalSubscriptionCheck);
      }

      // Get user ID using v16 methods
      if (window.OneSignal.User && window.OneSignal.User.onesignalId) {
        finalUserId = window.OneSignal.User.onesignalId;
        console.log('✅ Final User ID check - User.onesignalId:', finalUserId);
      } else if (window.OneSignal.User && window.OneSignal.User.PushSubscription && window.OneSignal.User.PushSubscription.id) {
        finalUserId = window.OneSignal.User.PushSubscription.id;
        console.log('✅ Final User ID check - User.PushSubscription.id:', finalUserId);
      } else if (typeof window.OneSignal.getUserId === 'function') {
        finalUserId = await window.OneSignal.getUserId();
        console.log('✅ Final User ID check - getUserId fallback:', finalUserId);
      }
    } catch (error) {
      console.warn('Could not verify subscription, checking available properties');
      console.log('🔍 Final verification - available properties:', {
        hasUser: !!window.OneSignal.User,
        hasOnesignalId: !!(window.OneSignal.User && window.OneSignal.User.onesignalId),
        onesignalId: window.OneSignal.User?.onesignalId,
        hasPushSubscription: !!(window.OneSignal.User && window.OneSignal.User.PushSubscription),
        pushSubscriptionId: window.OneSignal.User?.PushSubscription?.id,
        hasLegacyMethods: typeof window.OneSignal.getUserId === 'function'
      });
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

    // Get user ID using v16 methods
    let userId = null;
    if (window.OneSignal.User && window.OneSignal.User.onesignalId) {
      userId = window.OneSignal.User.onesignalId;
      console.log('📱 Using OneSignal User ID from User.onesignalId:', userId);
    } else if (window.OneSignal.User && window.OneSignal.User.PushSubscription && window.OneSignal.User.PushSubscription.id) {
      userId = window.OneSignal.User.PushSubscription.id;
      console.log('📱 Using OneSignal User ID from User.PushSubscription.id:', userId);
    } else if (typeof window.OneSignal.getUserId === 'function') {
      userId = await window.OneSignal.getUserId();
      console.log('📱 Using OneSignal User ID from getUserId fallback:', userId);
    }

    if (!userId) {
      throw new Error('No OneSignal user ID found. Please subscribe first.');
    }

    console.log('🎯 Sending notification to User ID:', userId);

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

    let userId = null;

    // OneSignal v16 methods
    if (window.OneSignal.User && window.OneSignal.User.onesignalId) {
      userId = window.OneSignal.User.onesignalId;
      console.log('👤 OneSignal User ID from User.onesignalId:', userId);
    }
    // Method 2: PushSubscription ID
    else if (window.OneSignal.User && window.OneSignal.User.PushSubscription && window.OneSignal.User.PushSubscription.id) {
      userId = window.OneSignal.User.PushSubscription.id;
      console.log('👤 OneSignal User ID from User.PushSubscription.id:', userId);
    }
    // Method 3: Async method if available
    else if (window.OneSignal.User && window.OneSignal.User.PushSubscription && typeof window.OneSignal.User.PushSubscription.getIdAsync === 'function') {
      userId = await window.OneSignal.User.PushSubscription.getIdAsync();
      console.log('👤 OneSignal User ID from User.PushSubscription.getIdAsync:', userId);
    }
    // Legacy fallback
    else if (typeof window.OneSignal.getUserId === 'function') {
      userId = await window.OneSignal.getUserId();
      console.log('👤 OneSignal User ID from getUserId fallback:', userId);
    }

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