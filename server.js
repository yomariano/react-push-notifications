// Node.js Server for Real Push Notifications
// This creates actual push messages that will appear on your phone

import webpush from 'web-push';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files with proper MIME types for service workers
app.use(express.static('dist', {
  setHeaders: (res, path) => {
    // Set correct MIME type for service worker files
    if (path.endsWith('.js') || path.includes('ServiceWorker') || path.includes('sw.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    // Set proper cache headers for service workers (no cache)
    if (path.includes('OneSignal') && path.includes('.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// VAPID keys (from your environment)
const VAPID_PUBLIC_KEY = 'BLgcx_kxWLsqiOF6ZcgZZ1c9ULSo1bTV_rrFCQlHCZqdz2dpJYFSPd5wUVVD8tgi4o4BV-chSiGP3OEIXNLsDx8';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'sizcnc28kg3nc3OpnRFNakszfutZiwZEeD-Y8yPVDRg';

// Configure web-push with VAPID details
webpush.setVapidDetails(
  'mailto:your-email@example.com', // Contact email
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Store subscriptions (in production, use a database)
let subscriptions = [];

console.log('🚀 Push Notification Server Starting...');
console.log('📧 VAPID Email: your-email@example.com');
console.log('🔑 VAPID Public Key:', VAPID_PUBLIC_KEY.substring(0, 30) + '...');
console.log('🔐 VAPID Private Key:', VAPID_PRIVATE_KEY ? 'Loaded' : 'Missing!');

// API endpoint to receive subscription from client
app.post('/api/subscribe', (req, res) => {
  console.log('📝 New subscription received:', req.ip);
  
  const subscription = req.body.subscription;
  
  if (!subscription || !subscription.endpoint) {
    console.error('❌ Invalid subscription data received');
    return res.status(400).json({ 
      error: 'Invalid subscription data',
      received: subscription 
    });
  }
  
  // Store subscription (replace with database in production)
  const existingIndex = subscriptions.findIndex(sub => 
    sub.endpoint === subscription.endpoint
  );
  
  if (existingIndex >= 0) {
    subscriptions[existingIndex] = subscription;
    console.log('🔄 Updated existing subscription');
  } else {
    subscriptions.push(subscription);
    console.log('✅ Added new subscription');
  }
  
  console.log('📊 Total active subscriptions:', subscriptions.length);
  
  res.json({ 
    success: true, 
    message: 'Subscription saved successfully',
    totalSubscriptions: subscriptions.length
  });
});

// API endpoint to send push notification
app.post('/api/send-notification', async (req, res) => {
  console.log('🔔 Push notification request received');
  
  const { title, body, icon, badge, tag, data } = req.body;
  
  if (subscriptions.length === 0) {
    console.warn('⚠️ No subscriptions available');
    return res.status(400).json({ 
      error: 'No subscriptions available',
      hint: 'Make sure to subscribe first from the web app'
    });
  }
  
  const payload = JSON.stringify({
    title: title || '🚀 React Push Test',
    body: body || 'Real push notification from server!',
    icon: icon || '/vite.svg',
    badge: badge || '/vite.svg',
    tag: tag || `server-push-${Date.now()}`,
    data: {
      url: '/',
      timestamp: Date.now(),
      source: 'node-server',
      ...data
    },
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/vite.svg'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  });
  
  console.log('📨 Sending to', subscriptions.length, 'subscribers');
  console.log('📄 Payload:', payload);
  
  const results = [];
  let successCount = 0;
  let failureCount = 0;
  
  // Send to all subscriptions
  for (let i = 0; i < subscriptions.length; i++) {
    const subscription = subscriptions[i];
    
    try {
      console.log(`📤 Sending to subscription ${i + 1}/${subscriptions.length}`);
      console.log('🎯 Endpoint:', subscription.endpoint.substring(0, 50) + '...');
      
      const result = await webpush.sendNotification(subscription, payload, {
        TTL: 60, // Time to live in seconds
        urgency: 'normal', // low, normal, high, very-low
        topic: 'general' // For message replacement
      });
      
      console.log('✅ Push sent successfully:', {
        statusCode: result.statusCode,
        headers: result.headers
      });
      
      results.push({
        subscription: subscription.endpoint.substring(0, 50) + '...',
        success: true,
        statusCode: result.statusCode
      });
      
      successCount++;
      
    } catch (error) {
      console.error('❌ Push failed for subscription:', error.message);
      console.error('🔍 Error details:', {
        statusCode: error.statusCode,
        body: error.body,
        headers: error.headers
      });
      
      results.push({
        subscription: subscription.endpoint.substring(0, 50) + '...',
        success: false,
        error: error.message,
        statusCode: error.statusCode
      });
      
      failureCount++;
      
      // Remove invalid subscriptions (410 = Gone)
      if (error.statusCode === 410) {
        console.log('🗑️ Removing invalid subscription');
        subscriptions.splice(i, 1);
        i--; // Adjust index after removal
      }
    }
  }
  
  console.log('📊 Push notification results:', {
    total: results.length,
    successful: successCount,
    failed: failureCount
  });
  
  res.json({
    success: successCount > 0,
    message: `Push sent to ${successCount}/${results.length} subscribers`,
    results: results,
    summary: {
      total: results.length,
      successful: successCount,
      failed: failureCount
    }
  });
});

// API endpoint to get subscription count
app.get('/api/subscriptions', (req, res) => {
  res.json({
    count: subscriptions.length,
    subscriptions: subscriptions.map(sub => ({
      endpoint: sub.endpoint.substring(0, 50) + '...',
      keys: sub.keys ? Object.keys(sub.keys) : []
    }))
  });
});

// API endpoint to clear all subscriptions (for testing)
app.delete('/api/subscriptions', (req, res) => {
  const count = subscriptions.length;
  subscriptions = [];
  console.log('🗑️ Cleared all subscriptions:', count);
  
  res.json({
    success: true,
    message: `Cleared ${count} subscriptions`
  });
});

// Send to ALL OneSignal subscribers (broadcast)
app.post('/api/onesignal-broadcast', async (req, res) => {
  console.log('📡 OneSignal broadcast notification request received');
  
  const { title, message, data, filters } = req.body;
  
  try {
    console.log('📢 Broadcasting OneSignal notification to all users');
    
    // OneSignal REST API call for broadcast
    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY || 'os_v2_app_7cgvvzhhmzdb7pyasbyhyg4fb2rzzg2wgopebeeod643vm43qbfradrvoiqqgev2sdvay5f7ho2yinxlgbvf355inm6ndr6fpzuzglq'}`
      },
      body: JSON.stringify({
        app_id: 'f88d5ae4-e766-461f-bf00-90707c1b850e',
        included_segments: ['Subscribed Users'], // Send to all subscribed users
        filters: filters || [], // Optional user filtering
        headings: { en: title || '🚨 Trading Alert' },
        contents: { en: message || 'New trading signal available!' },
        data: {
          url: '/',
          timestamp: Date.now(),
          source: 'broadcast-notification',
          ...data
        },
        web_url: 'https://react.signalstrading.app/',
        chrome_web_icon: 'https://react.signalstrading.app/vite.svg',
        firefox_icon: 'https://react.signalstrading.app/vite.svg'
      })
    });
    
    const oneSignalResult = await oneSignalResponse.json();
    console.log('📊 OneSignal broadcast response:', oneSignalResult);
    
    if (oneSignalResponse.ok && oneSignalResult.id) {
      console.log('✅ OneSignal broadcast sent successfully:', oneSignalResult.id);
      res.json({
        success: true,
        message: 'OneSignal broadcast sent successfully',
        notificationId: oneSignalResult.id,
        recipients: oneSignalResult.recipients || 'all'
      });
    } else {
      throw new Error(`OneSignal API error: ${oneSignalResult.errors || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('❌ OneSignal broadcast failed:', error);
    res.status(500).json({
      error: 'OneSignal broadcast failed',
      message: error.message,
      details: error
    });
  }
});

// OneSignal API endpoint for specific user
app.post('/api/onesignal-send', async (req, res) => {
  console.log('📨 OneSignal notification request received');
  
  const { title, message, userId, data } = req.body;
  
  if (!userId) {
    console.error('❌ No OneSignal user ID provided');
    return res.status(400).json({
      error: 'OneSignal user ID required',
      hint: 'Make sure user is subscribed to OneSignal first'
    });
  }
  
  try {
    console.log('🎯 Sending OneSignal notification to user:', userId);
    
    // OneSignal REST API call
    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY || 'os_v2_app_7cgvvzhhmzdb7pyasbyhyg4fb2rzzg2wgopebeeod643vm43qbfradrvoiqqgev2sdvay5f7ho2yinxlgbvf355inm6ndr6fpzuzglq'}`
      },
      body: JSON.stringify({
        app_id: 'f88d5ae4-e766-461f-bf00-90707c1b850e',
        include_player_ids: [userId],
        headings: { en: title },
        contents: { en: message },
        data: {
          url: '/',
          timestamp: Date.now(),
          source: 'server-onesignal',
          ...data
        },
        web_url: 'https://react.signalstrading.app/',
        chrome_web_icon: 'https://react.signalstrading.app/vite.svg',
        firefox_icon: 'https://react.signalstrading.app/vite.svg'
      })
    });
    
    const oneSignalResult = await oneSignalResponse.json();
    console.log('📊 OneSignal API response:', oneSignalResult);
    
    if (oneSignalResponse.ok && oneSignalResult.id) {
      console.log('✅ OneSignal notification sent successfully:', oneSignalResult.id);
      res.json({
        success: true,
        message: 'OneSignal notification sent successfully',
        notificationId: oneSignalResult.id,
        recipients: oneSignalResult.recipients || 1
      });
    } else {
      throw new Error(`OneSignal API error: ${oneSignalResult.errors || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('❌ OneSignal notification failed:', error);
    res.status(500).json({
      error: 'OneSignal notification failed',
      message: error.message,
      details: error
    });
  }
});

// Conditional notification endpoints for trading signals
app.post('/api/trading-signal', async (req, res) => {
  console.log('💹 Trading signal received - checking conditions...');
  
  const { 
    symbol, 
    price, 
    action, 
    confidence, 
    stopLoss, 
    takeProfit,
    userId = null // Optional: specific user, or broadcast to all
  } = req.body;
  
  try {
    // Example condition: Only send high confidence signals
    if (confidence < 75) {
      console.log('⚠️ Signal confidence too low, skipping notification');
      return res.json({
        success: true,
        message: 'Signal received but confidence too low for notification',
        notified: false
      });
    }
    
    // Build notification content
    const title = `🎯 ${action.toUpperCase()} Signal: ${symbol}`;
    const message = `${symbol} at $${price} | Confidence: ${confidence}% | SL: $${stopLoss} | TP: $${takeProfit}`;
    
    const notificationData = {
      signal: {
        symbol,
        price,
        action,
        confidence,
        stopLoss,
        takeProfit,
        timestamp: Date.now()
      },
      url: `/signals/${symbol.toLowerCase()}`
    };
    
    // Send notification directly via OneSignal API
    console.log('📡 Sending trading signal notification via OneSignal...');
    
    const oneSignalPayload = {
      app_id: 'f88d5ae4-e766-461f-bf00-90707c1b850e',
      headings: { en: title },
      contents: { en: message },
      data: notificationData,
      web_url: 'https://react.signalstrading.app/',
      chrome_web_icon: 'https://react.signalstrading.app/vite.svg',
      firefox_icon: 'https://react.signalstrading.app/vite.svg'
    };

    if (userId) {
      // Send to specific user
      console.log('🎯 Targeting specific user:', userId);
      oneSignalPayload.include_player_ids = [userId];
    } else {
      // Broadcast to all users
      console.log('📡 Broadcasting to all subscribed users');
      oneSignalPayload.included_segments = ['Subscribed Users'];
    }

    const notificationResult = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY || 'os_v2_app_7cgvvzhhmzdb7pyasbyhyg4fb2rzzg2wgopebeeod643vm43qbfradrvoiqqgev2sdvay5f7ho2yinxlgbvf355inm6ndr6fpzuzglq'}`
      },
      body: JSON.stringify(oneSignalPayload)
    });
    
    const result = await notificationResult.json();
    
    if (!notificationResult.ok) {
      throw new Error(`OneSignal API error: ${result.errors || JSON.stringify(result)}`);
    }
    
    res.json({
      success: true,
      message: 'Trading signal processed and notification sent',
      signal: { symbol, action, price, confidence },
      notification: result,
      notified: true
    });
    
  } catch (error) {
    console.error('❌ Trading signal notification failed:', error);
    res.status(500).json({
      error: 'Trading signal notification failed',
      message: error.message
    });
  }
});

// Price alert endpoint
app.post('/api/price-alert', async (req, res) => {
  console.log('💰 Price alert check received...');
  
  const { symbol, currentPrice, targetPrice, alertType, userId } = req.body;
  
  try {
    let shouldAlert = false;
    let alertMessage = '';
    
    // Check alert conditions
    if (alertType === 'above' && currentPrice >= targetPrice) {
      shouldAlert = true;
      alertMessage = `${symbol} reached $${currentPrice} (above target $${targetPrice})`;
    } else if (alertType === 'below' && currentPrice <= targetPrice) {
      shouldAlert = true;
      alertMessage = `${symbol} dropped to $${currentPrice} (below target $${targetPrice})`;
    }
    
    if (!shouldAlert) {
      return res.json({
        success: true,
        message: 'Price checked but alert conditions not met',
        notified: false,
        currentPrice,
        targetPrice
      });
    }
    
    // Send alert notification directly via OneSignal API
    const title = `🚨 Price Alert: ${symbol}`;
    
    const oneSignalPayload = {
      app_id: 'f88d5ae4-e766-461f-bf00-90707c1b850e',
      headings: { en: title },
      contents: { en: alertMessage },
      data: {
        alert: { symbol, currentPrice, targetPrice, alertType },
        url: `/alerts/${symbol.toLowerCase()}`
      },
      web_url: 'https://react.signalstrading.app/',
      chrome_web_icon: 'https://react.signalstrading.app/vite.svg',
      firefox_icon: 'https://react.signalstrading.app/vite.svg'
    };

    if (userId) {
      oneSignalPayload.include_player_ids = [userId];
    } else {
      oneSignalPayload.included_segments = ['Subscribed Users'];
    }

    const notificationResult = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY || 'os_v2_app_7cgvvzhhmzdb7pyasbyhyg4fb2rzzg2wgopebeeod643vm43qbfradrvoiqqgev2sdvay5f7ho2yinxlgbvf355inm6ndr6fpzuzglq'}`
      },
      body: JSON.stringify(oneSignalPayload)
    });
    
    const result = await notificationResult.json();
    
    if (!notificationResult.ok) {
      throw new Error(`OneSignal API error: ${result.errors || JSON.stringify(result)}`);
    }
    
    res.json({
      success: true,
      message: 'Price alert triggered and notification sent',
      alert: { symbol, currentPrice, targetPrice, alertType },
      notification: result,
      notified: true
    });
    
  } catch (error) {
    console.error('❌ Price alert notification failed:', error);
    res.status(500).json({
      error: 'Price alert notification failed',
      message: error.message
    });
  }
});

// Market event endpoint
app.post('/api/market-event', async (req, res) => {
  console.log('📈 Market event received...');
  
  const { eventType, title, message, severity = 'normal', userId = null } = req.body;
  
  try {
    // Only send high severity events
    if (severity === 'low') {
      return res.json({
        success: true,
        message: 'Event received but severity too low for notification',
        notified: false
      });
    }
    
    const eventTitle = title || `📈 Market Event: ${eventType}`;
    const eventIcon = severity === 'high' ? '🚨' : '📊';
    
    // Send market event notification directly via OneSignal API
    const oneSignalPayload = {
      app_id: 'f88d5ae4-e766-461f-bf00-90707c1b850e',
      headings: { en: `${eventIcon} ${eventTitle}` },
      contents: { en: message },
      data: {
        event: { eventType, severity, timestamp: Date.now() },
        url: '/market-events'
      },
      web_url: 'https://react.signalstrading.app/',
      chrome_web_icon: 'https://react.signalstrading.app/vite.svg',
      firefox_icon: 'https://react.signalstrading.app/vite.svg'
    };

    if (userId) {
      oneSignalPayload.include_player_ids = [userId];
    } else {
      oneSignalPayload.included_segments = ['Subscribed Users'];
    }

    const notificationResult = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY || 'os_v2_app_7cgvvzhhmzdb7pyasbyhyg4fb2rzzg2wgopebeeod643vm43qbfradrvoiqqgev2sdvay5f7ho2yinxlgbvf355inm6ndr6fpzuzglq'}`
      },
      body: JSON.stringify(oneSignalPayload)
    });
    
    const result = await notificationResult.json();
    
    if (!notificationResult.ok) {
      throw new Error(`OneSignal API error: ${result.errors || JSON.stringify(result)}`);
    }
    
    res.json({
      success: true,
      message: 'Market event processed and notification sent',
      event: { eventType, severity },
      notification: result,
      notified: true
    });
    
  } catch (error) {
    console.error('❌ Market event notification failed:', error);
    res.status(500).json({
      error: 'Market event notification failed',
      message: error.message
    });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handler
app.use((error, req, res, next) => {
  console.error('🚨 Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: error.message 
  });
});

// Debug endpoint to verify server is running
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Node.js server is running with API endpoints',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET  /api/health',
      'GET  /api/subscriptions',
      'POST /api/subscribe',
      'POST /api/send-notification',
      'POST /api/onesignal-send',
      'POST /api/onesignal-broadcast',
      'POST /api/trading-signal',
      'POST /api/price-alert',
      'POST /api/market-event'
    ]
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Server running on http://0.0.0.0:${PORT}`);
  console.log(`🔔 Push notifications ready!`);
  console.log(`📱 Test endpoints:`);
  console.log(`   GET  /api/health - Server health check`);
  console.log(`   POST /api/subscribe - Save subscription`);
  console.log(`   POST /api/send-notification - Send push`);
  console.log(`   POST /api/trading-signal - Trading signals`);
  console.log(`   POST /api/price-alert - Price alerts`);
  console.log(`   POST /api/market-event - Market events`);
  console.log(`   POST /api/onesignal-broadcast - Broadcast to all`);
  console.log(`   GET  /api/subscriptions - View subscriptions`);
  console.log('');
  console.log('🎯 Ready to send real push notifications to your phone!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Server shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Server shutting down gracefully');
  process.exit(0);
});