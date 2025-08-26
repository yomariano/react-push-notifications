# React Push Notifications - Frontend

Modern React frontend for push notification testing with OneSignal and Web Push API integration.

## Architecture

This is the **frontend application** that works with a separate backend server:

- **Frontend**: `https://react.signalstrading.app` (this repository)
- **Backend**: `https://server.signalstrading.app` ([backend repository](https://github.com/yomariano/push-notification-server))

## Features

- ✅ **React 19 + TypeScript** - Modern React with full type safety
- ✅ **OneSignal Integration** - Complete OneSignal v16 SDK integration
- ✅ **Web Push API** - Direct browser push notifications with VAPID
- ✅ **Separate Backend** - Clean API communication with dedicated server
- ✅ **Service Worker** - Handles push notifications in background
- ✅ **Comprehensive Testing** - UI for testing all notification features
- ✅ **Real-time Status** - Live subscription and permission monitoring
- ✅ **Mobile Optimized** - Works on phones, tablets, and desktop

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Backend API Server URL
VITE_API_BASE_URL=https://server.signalstrading.app
```

### Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Backend Server

This frontend requires the push notification backend server to be running. See the [backend repository](https://github.com/yomariano/push-notification-server) for setup instructions.

## API Integration

The frontend communicates with the backend through a clean API client (`src/config/api.ts`):

```typescript
import { apiClient } from './config/api';

// Send trading signal
await apiClient.sendTradingSignal({
  symbol: 'AAPL',
  price: 150.25,
  action: 'BUY',
  confidence: 85,
  stopLoss: 145.00,
  takeProfit: 160.00
});

// Send price alert
await apiClient.sendPriceAlert({
  symbol: 'BTC',
  currentPrice: 52000,
  targetPrice: 50000,
  alertType: 'above'
});

// Broadcast to all users
await apiClient.broadcastOneSignalNotification({
  title: 'Market Alert',
  message: 'Important trading update'
});
```

## Testing Features

The app includes comprehensive testing UI for:

### Web Push API
- Subscribe/unsubscribe to push notifications
- Send single and multiple test notifications
- View subscription details and status

### OneSignal
- Initialize and configure OneSignal SDK
- Subscribe to OneSignal notifications
- Send test notifications via OneSignal

### Programmatic Notifications
- **Trading Signals** - Conditional notifications for trading algorithms
- **Price Alerts** - Automated price-based notifications  
- **Market Events** - Severity-filtered market news
- **Broadcast** - Send to all subscribed users

## Deployment

### Static Hosting (Recommended)
Deploy the built files to any static hosting service:

```bash
npm run build
# Deploy the 'dist' folder
```

### Supported Platforms
- **Vercel** - Automatic deployments from GitHub
- **Netlify** - Static site hosting
- **Coolify** - Self-hosted deployment
- **AWS S3 + CloudFront** - Scalable static hosting

## Service Worker

The app includes a custom service worker (`public/sw.js`) that:
- Handles push notification events
- Shows notifications with custom styling
- Manages notification click actions
- Provides offline functionality

## OneSignal Files

Required OneSignal service worker files:
- `public/OneSignalSDKWorker.js` - OneSignal worker
- `public/OneSignalSDK.sw.js` - OneSignal service worker

## Architecture Benefits

**Separation of Concerns:**
- Frontend focuses on UI and user experience
- Backend handles all push notification logic
- Clean API boundaries for easy maintenance

**Scalability:**
- Frontend can be deployed to CDN for global performance
- Backend can scale independently for API load
- Multiple frontends can use the same backend

**Security:**
- API keys and sensitive data stay on backend
- Frontend only handles public configuration
- CORS properly configured for security

## Development

### Project Structure
```
src/
├── components/          # React components
├── config/             # API client and configuration
├── utils/              # Push notification utilities
└── main.tsx           # App entry point

public/
├── sw.js              # Service worker for push notifications
├── OneSignalSDKWorker.js   # OneSignal worker
└── OneSignalSDK.sw.js      # OneSignal service worker
```

### Adding New Features

1. **API Methods**: Add to `src/config/api.ts`
2. **UI Components**: Add to `src/components/`
3. **Utilities**: Add to `src/utils/`
4. **Types**: Define in TypeScript interfaces

## Related

- **Backend Server**: [push-notification-server](https://github.com/yomariano/push-notification-server)
- **OneSignal Docs**: [OneSignal Web SDK](https://documentation.onesignal.com/docs/web-push-sdk)
- **Web Push API**: [MDN Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
