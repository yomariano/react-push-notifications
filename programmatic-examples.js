// Programmatic Push Notification Examples
// Use these functions in your other applications to send notifications

const PUSH_SERVER_URL = 'https://react.signalstrading.app';

// 1. BROADCAST TO ALL USERS
async function broadcastTradingSignal(signal) {
  const response = await fetch(`${PUSH_SERVER_URL}/api/trading-signal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol: signal.symbol,           // e.g. 'AAPL'
      price: signal.price,            // e.g. 150.25
      action: signal.action,          // 'BUY' or 'SELL'
      confidence: signal.confidence,  // 0-100
      stopLoss: signal.stopLoss,     // e.g. 145.00
      takeProfit: signal.takeProfit  // e.g. 160.00
    })
  });
  
  return await response.json();
}

// 2. SEND TO SPECIFIC USER
async function sendPersonalizedSignal(userId, signal) {
  const response = await fetch(`${PUSH_SERVER_URL}/api/trading-signal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userId,  // OneSignal user ID
      ...signal
    })
  });
  
  return await response.json();
}

// 3. PRICE ALERTS
async function checkPriceAlert(priceData) {
  const response = await fetch(`${PUSH_SERVER_URL}/api/price-alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol: priceData.symbol,        // e.g. 'BTC'
      currentPrice: priceData.current, // Current market price
      targetPrice: priceData.target,   // User's alert price
      alertType: priceData.type,       // 'above' or 'below'
      userId: priceData.userId         // Optional: specific user
    })
  });
  
  return await response.json();
}

// 4. MARKET EVENTS
async function sendMarketEvent(event) {
  const response = await fetch(`${PUSH_SERVER_URL}/api/market-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType: event.type,      // e.g. 'EARNINGS', 'NEWS', 'VOLATILITY'
      title: event.title,         // Custom title
      message: event.message,     // Event description
      severity: event.severity,   // 'low', 'normal', 'high'
      userId: event.userId        // Optional: specific user
    })
  });
  
  return await response.json();
}

// 5. DIRECT ONESIGNAL BROADCAST
async function directBroadcast(title, message, customData = {}) {
  const response = await fetch(`${PUSH_SERVER_URL}/api/onesignal-broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: title,
      message: message,
      data: customData
    })
  });
  
  return await response.json();
}

// USAGE EXAMPLES:

// Example 1: Send trading signal when your algorithm generates one
async function onTradingAlgorithmSignal() {
  const signal = {
    symbol: 'AAPL',
    price: 150.25,
    action: 'BUY',
    confidence: 85,
    stopLoss: 145.00,
    takeProfit: 160.00
  };
  
  const result = await broadcastTradingSignal(signal);
  console.log('Signal notification sent:', result);
}

// Example 2: Check price alerts (run this periodically)
async function checkAllPriceAlerts() {
  // Get your price alerts from database
  const alerts = [
    { symbol: 'BTC', current: 45000, target: 50000, type: 'above', userId: 'user123' },
    { symbol: 'ETH', current: 2800, target: 3000, type: 'above', userId: 'user456' }
  ];
  
  for (const alert of alerts) {
    const result = await checkPriceAlert(alert);
    if (result.notified) {
      console.log(`Price alert triggered for ${alert.symbol}`);
    }
  }
}

// Example 3: Market event notification
async function onMarketNews(news) {
  const event = {
    type: 'EARNINGS',
    title: 'Apple Q4 Earnings',
    message: 'Apple beats earnings expectations by 15%',
    severity: 'high'
  };
  
  const result = await sendMarketEvent(event);
  console.log('Market event notification sent:', result);
}

// Example 4: Custom condition-based notification
async function checkCustomCondition() {
  // Your custom trading logic here
  const shouldNotify = Math.random() > 0.7; // Example condition
  
  if (shouldNotify) {
    await directBroadcast(
      '🚨 Market Alert',
      'Unusual market activity detected in tech sector',
      { sector: 'technology', timestamp: Date.now() }
    );
  }
}

// Example 5: Scheduled notifications (use with cron jobs)
async function dailyMarketSummary() {
  await directBroadcast(
    '📊 Daily Market Summary',
    'S&P 500: +1.2% | NASDAQ: +0.8% | DOW: +1.5%',
    { type: 'daily-summary', date: new Date().toISOString().split('T')[0] }
  );
}

// Export functions for use in other files
module.exports = {
  broadcastTradingSignal,
  sendPersonalizedSignal,
  checkPriceAlert,
  sendMarketEvent,
  directBroadcast,
  
  // Example usage functions
  onTradingAlgorithmSignal,
  checkAllPriceAlerts,
  onMarketNews,
  checkCustomCondition,
  dailyMarketSummary
};