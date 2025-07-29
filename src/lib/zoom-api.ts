import axios from 'axios';
import { getAuthHeaders } from './auth-utils';

export class ZoomAPI {
  private baseURL: string;
  private authURL: string;
  private accountId: string;
  private clientId: string;
  private clientSecret: string;
  private readonly TOKEN_KEY = 'zoom_access_token';
  private readonly TOKEN_EXPIRY_KEY = 'zoom_token_expiry';

  constructor() {
    this.baseURL = process.env.ZOOM_API_URL || 'https://api.zoom.us/v2';
    this.authURL = process.env.ZOOM_AUTH_URL || 'https://zoom.us/oauth/token';
    this.accountId = process.env.ZOOM_ACCOUNT_ID || '';
    
    // Decode the base64 encoded ZOOM_KEY to get client_id and client_secret
    const zoomKey = process.env.ZOOM_KEY || '';
    console.log('ZOOM_KEY available:', !!zoomKey);
    
    if (zoomKey) {
      try {
        const decoded = Buffer.from(zoomKey, 'base64').toString('utf-8');
        const [clientId, clientSecret] = decoded.split(':');
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        
        console.log('Client ID:', clientId);
        console.log('Client Secret:', clientSecret);
        
      } catch (error) {
        console.error('Failed to decode ZOOM_KEY:', error);
        this.clientId = '';
        this.clientSecret = '';
      }
    } else {
      this.clientId = '';
      this.clientSecret = '';
    }
  }

  // Check if cached token is valid
  private isTokenValid(): boolean {
    if (typeof window === 'undefined') return false; // Server-side
    
    const token = localStorage.getItem(this.TOKEN_KEY);
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    
    if (!token || !expiry) return false;
    
    const now = Date.now();
    const expiryTime = parseInt(expiry);
    
    return now < expiryTime;
  }

  // Get cached token
  private getCachedToken(): string | null {
    if (typeof window === 'undefined') return null; // Server-side
    
    if (this.isTokenValid()) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    
    // Clear expired token
    this.clearCachedToken();
    return null;
  }

  // Store token with expiration
  private storeToken(token: string): void {
    if (typeof window === 'undefined') return; // Server-side
    
    const expiry = Date.now() + (60 * 60 * 1000); // 1 hour from now
    
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiry.toString());
    
    console.log('✅ Token stored with 1-hour expiration');
  }

  // Clear cached token
  private clearCachedToken(): void {
    if (typeof window === 'undefined') return; // Server-side
    
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    
    console.log('🗑️ Cached token cleared');
  }

  // Get access token (now public)
  async getAccessToken(): Promise<string> {
    // Check for valid cached token first
    const cachedToken = this.getCachedToken();
    if (cachedToken) {
      console.log('✅ Using cached access token');
      return cachedToken;
    }
    
    console.log('🔄 Getting new access token...');
    
    try {
      const response = await axios.post(this.authURL, {
        grant_type: 'account_credentials',
        account_id: this.accountId,
      }, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token } = response.data;
      
      if (access_token) {
        this.storeToken(access_token);
        console.log('✅ New access token obtained and stored');
        return access_token;
      } else {
        throw new Error('No access token in response');
      }
    } catch (error) {
      console.error('❌ Failed to get access token:', error);
      throw error;
    }
  }

  // Test method to verify the access token works
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccessToken();
      console.log('✅ Access token obtained successfully');
      return true;
    } catch {
      console.log('❌ Failed to get access token');
      return false;
    }
  }

  // Get current user info
  async getCurrentUser(token: string) {
    const options = {
      method: 'GET',
      url: 'https://api.zoom.us/v2/users/me',
      headers: {Authorization: `Bearer ${token}`}
    };
    
    try {
      const { data } = await axios.request(options);
      console.log('✅ Current user info fetched');
      console.log('User data:', data);
      return data;
    } catch (error: unknown) {
      console.log('❌ Failed to get current user:', error instanceof Error ? error.message : 'Unknown error');
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } };
        console.log('Error response status:', axiosError.response?.status);
        console.log('Error response data:', axiosError.response?.data);
      }
      throw error;
    }
  }

  async getListMeetings(token: string, fromDate?: string, toDate?: string) {
    try {
      const authHeaders = await getAuthHeaders();
      
      const params = new URLSearchParams();
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      params.append('type', 'scheduled');
      params.append('page_size', '300');

      const response = await axios.get(`${this.baseURL}/users/me/recordings?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...authHeaders,
        },
      });

      return response.data;
    } catch (error) {
      console.error('❌ Failed to get meetings list:', error);
      throw error;
    }
  }

  // Get meeting recordings by meeting ID
  async getMeetingRecordings(token: string, meetingId: string) {
    try {
      const authHeaders = await getAuthHeaders();
      
      const response = await axios.get(`${this.baseURL}/meetings/${meetingId}/recordings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...authHeaders,
        },
      });

      return response.data;
    } catch (error) {
      console.error('❌ Failed to get meeting recordings:', error);
      throw error;
    }
  }

  async getUserInfo(userId: string = 'me'): Promise<unknown> {
    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.get(`https://api.zoom.us/v2/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });
      if (response.data) {
        console.log('✅ User info fetched successfully');
        console.log('User data:', response.data);
        return response.data;
      } else {
        throw new Error('No user data in response');
      }
    } catch (error: unknown) {
      console.error('Error fetching user info:', error instanceof Error ? error.message : 'Unknown error');
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } };
        console.log('Error response status:', axiosError.response?.status);
        console.log('Error response data:', axiosError.response?.data);
      }
      throw error;
    }
  }
}