import axios from 'axios';

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
    
    console.log('Getting new OAuth access token...');
    
    try {
      // Use ZOOM_KEY as the base64 encoded client credentials
      const zoomKey = process.env.ZOOM_KEY || '';
      
      if (!zoomKey) {
        throw new Error('ZOOM_KEY environment variable is required');
      }
      
      console.log('Using ZOOM_KEY as Basic auth credentials');
      
      const response = await axios.post(
        'https://zoom.us/oauth/token',
        new URLSearchParams({
          grant_type: 'account_credentials',
          account_id: this.accountId,
        }),
        {
          headers: {
            Authorization: `Basic ${zoomKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      if (response.data.access_token) {
        console.log('✅ OAuth successful');
        console.log('Access token:', response.data.access_token);
        
        // Store the token with expiration
        this.storeToken(response.data.access_token);
        
        return response.data.access_token;
      } else {
        throw new Error('No access token in OAuth response');
      }
      
    } catch (error: any) {
      console.log('❌ OAuth failed:', error.response?.status);
      console.log('Error details:', error.message);
      if (error.response?.data) {
        console.log('Error response:', error.response.data);
      }
      throw error;
    }
  }

  // Test method to verify the access token works
  async testConnection(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      console.log('✅ Access token obtained successfully');
      return true;
    } catch (error) {
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
    } catch (error: any) {
      console.log('❌ Failed to get current user:', error.response?.status);
      console.log('Error details:', error.message);
      if (error.response?.data) {
        console.log('Error response:', error.response.data);
      }
      throw error;
    }
  }

  async getListMeetings(token: string, fromDate?: string, toDate?: string) {
    try {
      // First get the current user info
      const userInfo = await this.getCurrentUser(token);
      const userId = userInfo.id;
      console.log("Using user ID:", userId);
      
      // Build URL with optional date parameters
      let url = `https://api.zoom.us/v2/users/${userId}/recordings`;
      const params = new URLSearchParams();
      
      // If no dates provided, use today's date
      if (!fromDate && !toDate) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        params.append('from', today);
        console.log('No dates provided, using today:', today);
      } else {
        if (fromDate) {
          params.append('from', fromDate);
          console.log('Using from date:', fromDate);
        }
        
        if (toDate) {
          params.append('to', toDate);
          console.log('Using to date:', toDate);
        }
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const options = {
        method: 'GET',
        url: url,
        headers: {Authorization: `Bearer ${token}`}
      };
      
      console.log('Fetching recordings from:', url);
      
      const { data } = await axios.request(options);
      console.log('✅ Recordings fetched successfully');
      console.log('Recordings data:', data);
      return data;
    } catch (error: any) {
      console.log('❌ Failed to get recordings:', error.response?.status);
      console.log('Error details:', error.message);
      if (error.response?.data) {
        console.log('Error response:', error.response.data);
      }
      throw error;
    }
  }

  // Get meeting recordings by meeting ID
  async getMeetingRecordings(token: string, meetingId: string) {
    const options = {
      method: 'GET',
      url: `https://api.zoom.us/v2/meetings/${meetingId}/recordings?include_fields=download_access_token,recording_play_passcode`,
      headers: {Authorization: `Bearer ${token}`}
    };
    
    try {
      const { data } = await axios.request(options);
      console.log('✅ Meeting recordings fetched successfully');
      console.log('Meeting recordings data:', data);
      return data;
    } catch (error: any) {
      console.log('❌ Failed to get meeting recordings:', error.response?.status);
      console.log('Error details:', error.message);
      if (error.response?.data) {
        console.log('Error response:', error.response.data);
      }
      throw error;
    }
  }

  async getUserInfo(userId: string = 'me'): Promise<any> {
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
    } catch (error: any) {
      console.error('Error fetching user info:', error.response?.status);
      console.log('Error details:', error.message);
      if (error.response?.data) {
        console.log('Error response:', error.response.data);
      }
      throw error;
    }
  }
}