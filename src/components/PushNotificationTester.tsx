// React Push Notification Tester Component
// Ultra-comprehensive testing interface with detailed status reporting

import React, { useState, useEffect, useCallback } from 'react';
import {
  subscribeToPushNotifications,
  sendTestNotification,
  getPushSubscriptionStatus,
  unsubscribeFromPushNotifications,
  VAPID_PUBLIC_KEY
} from '../utils/pushNotifications';
import {
  initOneSignal,
  getOneSignalStatus,
  subscribeOneSignal,
  sendOneSignalNotification,
  unsubscribeOneSignal,
  oneSignalConfig
} from '../utils/oneSignal';

interface PushStatus {
  isSupported: boolean;
  permission: NotificationPermission;
  hasSubscription: boolean;
  subscription?: any;
}

interface OneSignalStatus {
  isSupported: boolean;
  isInitialized: boolean;
  isPushSupported: boolean;
  notificationPermission: string;
  isSubscribed: boolean;
  userId?: string;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

const PushNotificationTester: React.FC = () => {
  const [status, setStatus] = useState<PushStatus>({
    isSupported: false,
    permission: 'default',
    hasSubscription: false
  });
  
  const [oneSignalStatus, setOneSignalStatus] = useState<OneSignalStatus>({
    isSupported: false,
    isInitialized: false,
    isPushSupported: false,
    notificationPermission: 'default',
    isSubscribed: false
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Comprehensive logging function
  const addLog = useCallback((level: LogEntry['level'], message: string, details?: any) => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      details
    };
    
    setLogs(prev => [...prev.slice(-49), entry]); // Keep last 50 logs
    
    // Also log to console with appropriate level
    const logMethod = level === 'error' ? 'error' : 
                     level === 'warning' ? 'warn' : 
                     level === 'success' ? 'log' : 'info';
    
    console[logMethod](`[${level.toUpperCase()}] ${message}`, details || '');
  }, []);

  // Initialize and check status
  const checkStatus = useCallback(async () => {
    try {
      addLog('info', 'Checking push notification status...');
      const newStatus = await getPushSubscriptionStatus();
      setStatus(newStatus);
      
      addLog('success', 'Status check completed', {
        supported: newStatus.isSupported,
        permission: newStatus.permission,
        hasSubscription: newStatus.hasSubscription
      });
    } catch (error) {
      addLog('error', 'Failed to check status', error);
    }
  }, [addLog]);

  // Check OneSignal status
  const checkOneSignalStatus = useCallback(async () => {
    try {
      addLog('info', 'Checking OneSignal status...');
      const newStatus = await getOneSignalStatus();
      setOneSignalStatus(newStatus);
      
      addLog('success', 'OneSignal status check completed', {
        initialized: newStatus.isInitialized,
        subscribed: newStatus.isSubscribed,
        userId: newStatus.userId
      });
    } catch (error) {
      addLog('error', 'Failed to check OneSignal status', error);
    }
  }, [addLog]);

  // Initialize component
  useEffect(() => {
    const init = async () => {
      addLog('info', 'Initializing Push Notification Tester...');
      addLog('info', `VAPID Public Key: ${VAPID_PUBLIC_KEY.substring(0, 20)}...`);
      addLog('info', `OneSignal App ID: ${oneSignalConfig.appId}`);
      
      // Initialize both systems in parallel
      const [, oneSignalInit] = await Promise.allSettled([
        checkStatus(),
        initOneSignal()
      ]);
      
      if (oneSignalInit.status === 'fulfilled' && oneSignalInit.value) {
        addLog('success', 'OneSignal initialized successfully');
        await checkOneSignalStatus();
      } else {
        addLog('warning', 'OneSignal initialization failed');
        addLog('info', 'If you updated OneSignal domain settings, try refreshing the page');
        addLog('info', '💡 Web Push API is always available as an alternative!');
      }
      
      setIsInitialized(true);
      addLog('success', 'Component initialized successfully');
    };

    init();
  }, [addLog, checkStatus, checkOneSignalStatus]);

  // Subscribe to push notifications
  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      addLog('info', 'Starting subscription process...');
      
      const subscription = await subscribeToPushNotifications();
      
      if (subscription) {
        addLog('success', 'Successfully subscribed to push notifications!', {
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          expirationTime: subscription.expirationTime
        });
        
        await checkStatus(); // Refresh status
      } else {
        throw new Error('Subscription returned null');
      }
    } catch (error: any) {
      addLog('error', `Subscription failed: ${error.message}`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Send test notification
  const handleSendTest = async () => {
    setIsLoading(true);
    try {
      addLog('info', 'Sending test notification...');
      
      const success = await sendTestNotification({
        title: '🎉 React Push Success!',
        body: 'Your push notification system is working perfectly!',
        data: {
          testId: Date.now(),
          source: 'react-tester'
        }
      });
      
      if (success) {
        addLog('success', 'Test notification sent successfully!');
      } else {
        throw new Error('Test notification failed');
      }
    } catch (error: any) {
      addLog('error', `Test notification failed: ${error.message}`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Send multiple test notifications
  const handleSendMultiple = async () => {
    setIsLoading(true);
    try {
      addLog('info', 'Sending multiple test notifications...');
      
      const notifications = [
        { title: '📱 Mobile Test 1', body: 'First test notification' },
        { title: '🔔 Mobile Test 2', body: 'Second test notification' },
        { title: '⚡ Mobile Test 3', body: 'Third test notification' }
      ];
      
      for (let i = 0; i < notifications.length; i++) {
        await sendTestNotification(notifications[i]);
        addLog('info', `Sent notification ${i + 1}/${notifications.length}`);
        
        // Delay between notifications
        if (i < notifications.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      addLog('success', 'All test notifications sent!');
    } catch (error: any) {
      addLog('error', `Multiple notifications failed: ${error.message}`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Unsubscribe from notifications
  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      addLog('info', 'Unsubscribing from push notifications...');
      
      const success = await unsubscribeFromPushNotifications();
      
      if (success) {
        addLog('success', 'Successfully unsubscribed from push notifications');
        await checkStatus(); // Refresh status
      } else {
        throw new Error('Unsubscription failed');
      }
    } catch (error: any) {
      addLog('error', `Unsubscription failed: ${error.message}`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // OneSignal subscription handler
  const handleOneSignalSubscribe = async () => {
    setIsLoading(true);
    try {
      addLog('info', 'Starting OneSignal subscription...');
      
      const success = await subscribeOneSignal();
      
      if (success) {
        addLog('success', 'OneSignal subscription successful!');
        await checkOneSignalStatus(); // Refresh status
      } else {
        throw new Error('OneSignal subscription failed');
      }
    } catch (error: any) {
      addLog('error', `OneSignal subscription failed: ${error.message}`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // OneSignal test notification handler
  const handleOneSignalTest = async () => {
    setIsLoading(true);
    try {
      addLog('info', 'Sending OneSignal test notification...');
      
      const success = await sendOneSignalNotification(
        '🎯 OneSignal Test',
        'OneSignal push notification working perfectly! Check your phone! 📱'
      );
      
      if (success) {
        addLog('success', 'OneSignal test notification sent successfully!');
      } else {
        throw new Error('OneSignal test notification failed');
      }
    } catch (error: any) {
      addLog('error', `OneSignal test failed: ${error.message}`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // OneSignal unsubscribe handler
  const handleOneSignalUnsubscribe = async () => {
    setIsLoading(true);
    try {
      addLog('info', 'Unsubscribing from OneSignal...');
      
      const success = await unsubscribeOneSignal();
      
      if (success) {
        addLog('success', 'OneSignal unsubscription successful');
        await checkOneSignalStatus(); // Refresh status
      } else {
        throw new Error('OneSignal unsubscription failed');
      }
    } catch (error: any) {
      addLog('error', `OneSignal unsubscription failed: ${error.message}`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'Logs cleared');
  };

  // Copy subscription details
  const copySubscription = () => {
    if (status.subscription) {
      navigator.clipboard.writeText(JSON.stringify(status.subscription, null, 2));
      addLog('success', 'Subscription details copied to clipboard');
    }
  };

  if (!isInitialized) {
    return <div className="loading">Initializing Push Notification Tester...</div>;
  }

  return (
    <div className="push-tester">
      <header className="tester-header">
        <h1>🚀 React Push Notification Tester</h1>
        <p>Ultra-comprehensive testing interface for Web Push API</p>
      </header>

      {/* Status Panel */}
      <div className="status-panel">
        <h2>📊 Push Notification Status</h2>
        <h3>🔔 Web Push API</h3>
        <div className="status-grid">
          <div className={`status-item ${status.isSupported ? 'supported' : 'not-supported'}`}>
            <span className="status-label">Browser Support:</span>
            <span className="status-value">{status.isSupported ? '✅ Supported' : '❌ Not Supported'}</span>
          </div>
          
          <div className={`status-item ${status.permission === 'granted' ? 'granted' : 
                                        status.permission === 'denied' ? 'denied' : 'default'}`}>
            <span className="status-label">Permission:</span>
            <span className="status-value">
              {status.permission === 'granted' ? '✅ Granted' : 
               status.permission === 'denied' ? '❌ Denied' : 
               '⏳ Not Requested'}
            </span>
          </div>
          
          <div className={`status-item ${status.hasSubscription ? 'subscribed' : 'not-subscribed'}`}>
            <span className="status-label">Subscription:</span>
            <span className="status-value">{status.hasSubscription ? '✅ Active' : '❌ None'}</span>
          </div>
        </div>

        <h3>🎯 OneSignal</h3>
        <div className="status-grid">
          <div className={`status-item ${oneSignalStatus.isInitialized ? 'supported' : 'not-supported'}`}>
            <span className="status-label">OneSignal:</span>
            <span className="status-value">{oneSignalStatus.isInitialized ? '✅ Initialized' : '❌ Not Initialized'}</span>
          </div>
          
          <div className={`status-item ${oneSignalStatus.notificationPermission === 'granted' ? 'granted' : 
                                        oneSignalStatus.notificationPermission === 'denied' ? 'denied' : 'default'}`}>
            <span className="status-label">OS Permission:</span>
            <span className="status-value">
              {oneSignalStatus.notificationPermission === 'granted' ? '✅ Granted' : 
               oneSignalStatus.notificationPermission === 'denied' ? '❌ Denied' : 
               '⏳ Not Requested'}
            </span>
          </div>
          
          <div className={`status-item ${oneSignalStatus.isSubscribed ? 'subscribed' : 'not-subscribed'}`}>
            <span className="status-label">OS Subscription:</span>
            <span className="status-value">{oneSignalStatus.isSubscribed ? '✅ Active' : '❌ None'}</span>
          </div>
        </div>
        
        {status.subscription && (
          <div className="subscription-details">
            <h3>📋 Subscription Details</h3>
            <div className="details-content">
              <p><strong>Endpoint:</strong> {status.subscription.endpoint?.substring(0, 80)}...</p>
              {status.subscription.keys && (
                <>
                  <p><strong>P256DH Key:</strong> {status.subscription.keys.p256dh?.substring(0, 40)}...</p>
                  <p><strong>Auth Key:</strong> {status.subscription.keys.auth?.substring(0, 20)}...</p>
                </>
              )}
            </div>
            <button onClick={copySubscription} className="copy-button">
              📋 Copy Full Details
            </button>
          </div>
        )}
      </div>

      {/* Action Panel */}
      <div className="action-panel">
        <h2>🎯 Actions</h2>
        <h3>🔔 Web Push API Tests</h3>
        <div className="button-grid">
          <button 
            onClick={handleSubscribe}
            disabled={isLoading || !status.isSupported || status.hasSubscription}
            className="action-button subscribe"
          >
            {isLoading ? '⏳ Subscribing...' : '🔔 Subscribe to Push'}
          </button>
          
          <button 
            onClick={handleSendTest}
            disabled={isLoading || !status.hasSubscription}
            className="action-button test"
          >
            {isLoading ? '⏳ Sending...' : '📱 Send Test Notification'}
          </button>
          
          <button 
            onClick={handleSendMultiple}
            disabled={isLoading || !status.hasSubscription}
            className="action-button multiple"
          >
            {isLoading ? '⏳ Sending...' : '🔄 Send Multiple Tests'}
          </button>
          
          <button 
            onClick={handleUnsubscribe}
            disabled={isLoading || !status.hasSubscription}
            className="action-button unsubscribe"
          >
            {isLoading ? '⏳ Unsubscribing...' : '🔕 Unsubscribe'}
          </button>
        </div>

        <h3>🎯 OneSignal Tests</h3>
        <div className="button-grid">
          <button 
            onClick={handleOneSignalSubscribe}
            disabled={isLoading || !oneSignalStatus.isInitialized || oneSignalStatus.isSubscribed}
            className="action-button subscribe"
          >
            {isLoading ? '⏳ Subscribing...' : '🎯 Subscribe OneSignal'}
          </button>
          
          <button 
            onClick={handleOneSignalTest}
            disabled={isLoading || !oneSignalStatus.isSubscribed}
            className="action-button test"
          >
            {isLoading ? '⏳ Sending...' : '📲 Send OneSignal Test'}
          </button>
          
          <button 
            onClick={handleOneSignalUnsubscribe}
            disabled={isLoading || !oneSignalStatus.isSubscribed}
            className="action-button unsubscribe"
          >
            {isLoading ? '⏳ Unsubscribing...' : '🚫 Unsubscribe OneSignal'}
          </button>
        </div>

        <h3>🔄 Status & Debugging</h3>
        <div className="button-grid">
          <button 
            onClick={checkStatus}
            disabled={isLoading}
            className="action-button refresh"
          >
            {isLoading ? '⏳ Checking...' : '🔄 Refresh Web Push'}
          </button>
          
          <button 
            onClick={checkOneSignalStatus}
            disabled={isLoading}
            className="action-button refresh"
          >
            {isLoading ? '⏳ Checking...' : '🎯 Refresh OneSignal'}
          </button>
        </div>
      </div>

      {/* Log Panel */}
      <div className="log-panel">
        <div className="log-header">
          <h2>📝 Activity Log</h2>
          <button onClick={clearLogs} className="clear-logs">🗑️ Clear</button>
        </div>
        
        <div className="log-container">
          {logs.length === 0 ? (
            <div className="no-logs">No activity yet...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`log-entry ${log.level}`}>
                <span className="log-timestamp">[{log.timestamp}]</span>
                <span className="log-level">[{log.level.toUpperCase()}]</span>
                <span className="log-message">{log.message}</span>
                {log.details && (
                  <details className="log-details">
                    <summary>View details</summary>
                    <pre>{JSON.stringify(log.details, null, 2)}</pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Help Panel */}
      <div className="help-panel">
        <h2>❓ Instructions</h2>
        <h3>🔔 Web Push API Testing:</h3>
        <ol>
          <li><strong>Subscribe:</strong> Click "Subscribe to Push" to enable Web Push notifications</li>
          <li><strong>Test Single:</strong> Send one test notification through the server</li>
          <li><strong>Test Multiple:</strong> Send 3 rapid notifications to test mobile behavior</li>
        </ol>
        
        <h3>🎯 OneSignal Testing:</h3>
        <ol>
          <li><strong>Subscribe OneSignal:</strong> Click "Subscribe OneSignal" to enable OneSignal notifications</li>
          <li><strong>Test OneSignal:</strong> Send test notification through OneSignal's service</li>
          <li><strong>Compare:</strong> Test both systems to see which works better on your device</li>
        </ol>
        
        <p><strong>📱 Mobile Testing:</strong> Look at your phone/device for the notifications after clicking test buttons!</p>
        
        <div className="technical-info">
          <h3>🔧 Technical Details</h3>
          <h4>Web Push API:</h4>
          <p><strong>VAPID Key:</strong> {VAPID_PUBLIC_KEY.substring(0, 30)}...</p>
          <p><strong>Service Worker:</strong> /sw.js</p>
          
          <h4>OneSignal:</h4>
          <p><strong>App ID:</strong> {oneSignalConfig.appId}</p>
          <p><strong>Safari Web ID:</strong> {oneSignalConfig.safariWebId?.substring(0, 30)}...</p>
          
          <h4>Environment:</h4>
          <p><strong>Protocol:</strong> {window.location.protocol}</p>
          <p><strong>Host:</strong> {window.location.host}</p>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationTester;