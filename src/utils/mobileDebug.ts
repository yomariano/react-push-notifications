// Mobile Push Notification Debugging Utilities
// Helps diagnose subscription issues on mobile devices

export interface MobileDebugInfo {
  browser: string;
  isSecure: boolean;
  supportsNotifications: boolean;
  supportsServiceWorker: boolean;
  notificationPermission: string;
  oneSignalAvailable: boolean;
  oneSignalVersion: string;
  userAgent: string;
  issues: string[];
  recommendations: string[];
}

/**
 * Comprehensive mobile debugging for push notifications
 */
export async function getMobileDebugInfo(): Promise<MobileDebugInfo> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Browser detection
  const userAgent = navigator.userAgent;
  let browser = 'Unknown';
  
  if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('Opera')) browser = 'Opera';
  
  // Security check
  const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
  if (!isSecure) {
    issues.push('Site is not served over HTTPS');
    recommendations.push('Push notifications require HTTPS. Access the site via https://');
  }
  
  // Notification support
  const supportsNotifications = 'Notification' in window;
  if (!supportsNotifications) {
    issues.push('Browser does not support notifications');
    recommendations.push('Try using Chrome, Firefox, or Edge');
  }
  
  // Service Worker support
  const supportsServiceWorker = 'serviceWorker' in navigator;
  if (!supportsServiceWorker) {
    issues.push('Browser does not support Service Workers');
    recommendations.push('Service Workers are required for push notifications');
  }
  
  // Permission status
  const notificationPermission = supportsNotifications ? Notification.permission : 'unsupported';
  if (notificationPermission === 'denied') {
    issues.push('Notification permission is denied');
    recommendations.push('Go to browser settings and allow notifications for this site');
  }
  
  // OneSignal availability
  const oneSignalAvailable = !!(window as any).OneSignal;
  let oneSignalVersion = 'Not loaded';
  
  if (oneSignalAvailable) {
    try {
      const oneSignal = (window as any).OneSignal;
      // Try to detect version
      if (oneSignal.User && oneSignal.User.PushSubscription) {
        oneSignalVersion = 'v16+ (Modern)';
      } else if (oneSignal.isPushNotificationsEnabled) {
        oneSignalVersion = 'v15 (Legacy)';
      } else {
        oneSignalVersion = 'Unknown version';
      }
    } catch (error) {
      oneSignalVersion = 'Error detecting version';
      issues.push('OneSignal object is corrupted or not properly initialized');
    }
  } else {
    issues.push('OneSignal SDK not loaded');
    recommendations.push('Check network connection and reload the page');
  }
  
  // Mobile-specific checks
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  if (isMobile) {
    if (browser === 'Safari' && userAgent.includes('iPhone')) {
      issues.push('iOS Safari has limited push notification support');
      recommendations.push('Try using Chrome or Firefox on iOS for better compatibility');
    }
    
    if (browser === 'Chrome' && userAgent.includes('Android')) {
      // Chrome Android should work well
      recommendations.push('Chrome Android has excellent push notification support');
    }
  }
  
  return {
    browser,
    isSecure,
    supportsNotifications,
    supportsServiceWorker,
    notificationPermission,
    oneSignalAvailable,
    oneSignalVersion,
    userAgent,
    issues,
    recommendations
  };
}

/**
 * Format debug info for display
 */
export function formatDebugInfo(debugInfo: MobileDebugInfo): string {
  let output = '📱 Mobile Push Notification Debug Info\n\n';
  
  output += '🔧 System Information:\n';
  output += `   Browser: ${debugInfo.browser}\n`;
  output += `   Secure (HTTPS): ${debugInfo.isSecure ? '✅ Yes' : '❌ No'}\n`;
  output += `   Notifications: ${debugInfo.supportsNotifications ? '✅ Supported' : '❌ Not supported'}\n`;
  output += `   Service Workers: ${debugInfo.supportsServiceWorker ? '✅ Supported' : '❌ Not supported'}\n`;
  output += `   Permission: ${debugInfo.notificationPermission}\n`;
  output += `   OneSignal: ${debugInfo.oneSignalAvailable ? '✅ Loaded' : '❌ Not loaded'}\n`;
  output += `   OneSignal Version: ${debugInfo.oneSignalVersion}\n\n`;
  
  if (debugInfo.issues.length > 0) {
    output += '❌ Issues Found:\n';
    debugInfo.issues.forEach((issue, index) => {
      output += `   ${index + 1}. ${issue}\n`;
    });
    output += '\n';
  }
  
  if (debugInfo.recommendations.length > 0) {
    output += '💡 Recommendations:\n';
    debugInfo.recommendations.forEach((rec, index) => {
      output += `   ${index + 1}. ${rec}\n`;
    });
    output += '\n';
  }
  
  if (debugInfo.issues.length === 0) {
    output += '✅ No issues detected! Your browser should support push notifications.\n\n';
  }
  
  output += '🔍 Technical Details:\n';
  output += `   User Agent: ${debugInfo.userAgent}\n`;
  
  return output;
}

/**
 * Test basic notification functionality
 */
export async function testBasicNotification(): Promise<{ success: boolean; message: string }> {
  try {
    if (!('Notification' in window)) {
      return { success: false, message: 'Notifications not supported in this browser' };
    }
    
    if (Notification.permission === 'denied') {
      return { success: false, message: 'Notification permission is denied' };
    }
    
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { success: false, message: 'Notification permission was not granted' };
      }
    }
    
    // Create a basic browser notification
    const notification = new Notification('🧪 Test Notification', {
      body: 'This is a basic browser notification test. If you see this, notifications work!',
      icon: '/vite.svg',
      tag: 'test-notification'
    });
    
    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
    
    return { success: true, message: 'Basic notification sent successfully' };
    
  } catch (error) {
    return { success: false, message: `Notification test failed: ${(error as Error).message}` };
  }
}