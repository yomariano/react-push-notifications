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

interface PushStatus {
  isSupported: boolean;
  permission: NotificationPermission;
  hasSubscription: boolean;
  subscription?: any;
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

  // Initialize component
  useEffect(() => {
    const init = async () => {
      addLog('info', 'Initializing Push Notification Tester...');
      addLog('info', `VAPID Public Key: ${VAPID_PUBLIC_KEY.substring(0, 20)}...`);
      
      await checkStatus();
      setIsInitialized(true);
      
      addLog('success', 'Component initialized successfully');
    };

    init();
  }, [addLog, checkStatus]);

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
        <h2>📊 Current Status</h2>
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
          
          <button 
            onClick={checkStatus}
            disabled={isLoading}
            className="action-button refresh"
          >
            {isLoading ? '⏳ Checking...' : '🔄 Refresh Status'}
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
        <ol>
          <li><strong>Subscribe:</strong> Click "Subscribe to Push" to enable notifications</li>
          <li><strong>Test Single:</strong> Send one test notification to verify it works</li>
          <li><strong>Test Multiple:</strong> Send 3 rapid notifications to test mobile behavior</li>
          <li><strong>Check Mobile:</strong> Look at your phone/device for the notifications!</li>
          <li><strong>Debug:</strong> Check the activity log for detailed information</li>
        </ol>
        
        <div className="technical-info">
          <h3>🔧 Technical Details</h3>
          <p><strong>VAPID Key:</strong> {VAPID_PUBLIC_KEY.substring(0, 30)}...</p>
          <p><strong>Service Worker:</strong> /sw.js</p>
          <p><strong>Protocol:</strong> {window.location.protocol}</p>
          <p><strong>Host:</strong> {window.location.host}</p>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationTester;