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
app.use(express.static('dist'));

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

// OneSignal API endpoint
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Server running on http://0.0.0.0:${PORT}`);
  console.log(`🔔 Push notifications ready!`);
  console.log(`📱 Test endpoints:`);
  console.log(`   POST /api/subscribe - Save subscription`);
  console.log(`   POST /api/send-notification - Send push`);
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