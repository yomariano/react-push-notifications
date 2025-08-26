// API Configuration for Push Notification System
// Handles communication between frontend and backend services

// Backend server configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://server.signalstrading.app';

// API endpoints
export const API_ENDPOINTS = {
  // Health and configuration
  health: `${API_BASE_URL}/api/health`,
  vapidKey: `${API_BASE_URL}/api/vapid-key`,
  
  // Web Push API
  subscribe: `${API_BASE_URL}/api/subscribe`,
  sendNotification: `${API_BASE_URL}/api/send-notification`,
  subscriptions: `${API_BASE_URL}/api/subscriptions`,
  
  // OneSignal
  oneSignalSend: `${API_BASE_URL}/api/onesignal-send`,
  oneSignalBroadcast: `${API_BASE_URL}/api/onesignal-broadcast`,
  
  // Conditional notifications
  tradingSignal: `${API_BASE_URL}/api/trading-signal`,
  priceAlert: `${API_BASE_URL}/api/price-alert`,
  marketEvent: `${API_BASE_URL}/api/market-event`,
};

// API client with error handling
export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);
      
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API Response:`, data);
      
      return data;
    } catch (error) {
      console.error(`❌ API Error for ${url}:`, error);
      throw error;
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Health check
  async healthCheck(): Promise<{
    status: string;
    service: string;
    version: string;
    timestamp: string;
    endpoints: string[];
    config: {
      vapidConfigured: boolean;
      oneSignalConfigured: boolean;
      corsOrigins: string[];
    };
  }> {
    return this.get('/api/health');
  }

  // Get VAPID public key
  async getVapidKey(): Promise<{ publicKey: string }> {
    return this.get('/api/vapid-key');
  }

  // Web Push API methods
  async saveSubscription(subscription: PushSubscription): Promise<{
    success: boolean;
    message: string;
    totalSubscriptions: number;
  }> {
    return this.post('/api/subscribe', { subscription });
  }

  async sendWebPushNotification(notification: {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
  }): Promise<{
    success: boolean;
    message: string;
    results: any[];
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    return this.post('/api/send-notification', notification);
  }

  // OneSignal methods
  async sendOneSignalNotification(data: {
    title: string;
    message: string;
    userId: string;
    data?: any;
  }): Promise<{
    success: boolean;
    message: string;
    notificationId: string;
    recipients: number;
  }> {
    return this.post('/api/onesignal-send', data);
  }

  async broadcastOneSignalNotification(data: {
    title: string;
    message: string;
    data?: any;
    filters?: any[];
  }): Promise<{
    success: boolean;
    message: string;
    notificationId: string;
    recipients: string;
  }> {
    return this.post('/api/onesignal-broadcast', data);
  }

  // Conditional notification methods
  async sendTradingSignal(signal: {
    symbol: string;
    price: number;
    action: string;
    confidence: number;
    stopLoss: number;
    takeProfit: number;
    userId?: string;
  }): Promise<{
    success: boolean;
    message: string;
    signal: any;
    notification: any;
    notified: boolean;
  }> {
    return this.post('/api/trading-signal', signal);
  }

  async sendPriceAlert(alert: {
    symbol: string;
    currentPrice: number;
    targetPrice: number;
    alertType: 'above' | 'below';
    userId?: string;
  }): Promise<{
    success: boolean;
    message: string;
    alert: any;
    notification?: any;
    notified: boolean;
  }> {
    return this.post('/api/price-alert', alert);
  }

  async sendMarketEvent(event: {
    eventType: string;
    title?: string;
    message: string;
    severity?: 'low' | 'normal' | 'high';
    userId?: string;
  }): Promise<{
    success: boolean;
    message: string;
    event: any;
    notification?: any;
    notified: boolean;
  }> {
    return this.post('/api/market-event', event);
  }
}

// Default API client instance
export const apiClient = new ApiClient();

// Configuration
export const API_CONFIG = {
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds
  retries: 3,
};

export default apiClient;