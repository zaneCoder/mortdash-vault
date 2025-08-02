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
      
    } catch (error: unknown) {
      console.log('❌ OAuth failed:', error instanceof Error ? error.message : 'Unknown error');
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } };
        console.log('Error response status:', axiosError.response?.status);
        console.log('Error response data:', axiosError.response?.data);
      }
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
  async getCurrentUser(token: string, userId: string = 'me') {
    const options = {
      method: 'GET',
      url: `https://api.zoom.us/v2/users/${userId}`,
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

  // Get all users in the account
  async getAllUsers(token: string) {
    try {
      const options = {
        method: 'GET',
        url: 'https://api.zoom.us/v2/users',
        headers: {Authorization: `Bearer ${token}`}
      };
      
      console.log('🔍 Fetching all users from Zoom account...');
      
      const { data } = await axios.request(options);
      console.log('✅ All users fetched successfully');
      console.log('Users data:', data);
      return data;
    } catch (error: unknown) {
      console.log('❌ Failed to get all users:', error instanceof Error ? error.message : 'Unknown error');
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } };
        console.log('Error response status:', axiosError.response?.status);
        console.log('Error response data:', axiosError.response?.data);
      }
      throw error;
    }
  }

  async getListMeetings(token: string, fromDate?: string, toDate?: string, userId?: string) {
    try {
      let finalUserId: string;
      let isUserSpecific = false;
      let userValidation = null;
      
      if (userId && userId.trim()) {
        // Validate the provided userId against actual Zoom users
        console.log('🔍 Validating userId against Zoom users:', userId);
        const allUsers = await this.getAllUsers(token);
        const users = allUsers.users || [];
        
        // Find the user by email
        const matchingUser = users.find((user: { email: string; id: string; display_name: string }) => 
          user.email && user.email.toLowerCase() === userId.toLowerCase().trim()
        );
        
        if (matchingUser) {
          finalUserId = matchingUser.id;
          isUserSpecific = true;
          userValidation = {
            isValid: true,
            user: matchingUser,
            message: `User found: ${matchingUser.display_name} (${matchingUser.email})`
          };
          console.log(`User validation successful: ${matchingUser.display_name} (${matchingUser.email})`);
        } else {
          // User not found - return error instead of falling back to "me"
          const errorMessage = `User '${userId}' not found in this Zoom account. Please check the email address and try again.`;
          console.log(errorMessage);
          
          throw new Error(errorMessage);
        }
      } else {
        // Only use "me" if no userId is provided
        console.log('No userId provided, using "me" to get current user recordings');
        const userInfo = await this.getCurrentUser(token, 'me');
        finalUserId = userInfo.id;
        isUserSpecific = false;
        userValidation = {
          isValid: true,
          user: userInfo,
          message: `Using current user: ${userInfo.display_name} (${userInfo.email})`
        };
        console.log(`Using current user: ${userInfo.display_name} (${userInfo.email})`);
      }
      
      // Build base URL with optional date parameters
      const baseUrl = `https://api.zoom.us/v2/users/${finalUserId}/recordings`;
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
      
      console.log('User-specific endpoint:', isUserSpecific);
      
      // Initialize variables for pagination
      let allMeetings: unknown[] = [];
      let nextPageToken: string | null = null;
      let pageCount = 0;
      let totalRecords = 0;
      
      // Fetch all pages
      do {
        pageCount++;
        console.log(`📄 Fetching page ${pageCount}...`);
        
        // Build URL for current page
        let url = baseUrl;
        const currentParams = new URLSearchParams(params);
        
        if (nextPageToken) {
          currentParams.append('next_page_token', nextPageToken);
        }
        
        if (currentParams.toString()) {
          url += `?${currentParams.toString()}`;
        }
        
        const options = {
          method: 'GET',
          url: url,
          headers: {Authorization: `Bearer ${token}`}
        };
        
        console.log('Fetching recordings from:', url);
        
        const { data } = await axios.request(options);
        console.log(`✅ Page ${pageCount} fetched successfully`);
        console.log(`Page ${pageCount} data:`, {
          total_records: (data as { total_records?: number }).total_records,
          page_size: (data as { page_size?: number }).page_size,
          page_count: (data as { page_count?: number }).page_count,
          next_page_token: (data as { next_page_token?: string }).next_page_token ? 'present' : 'none',
          meetings_count: (data as { meetings?: unknown[] }).meetings ? (data as { meetings?: unknown[] }).meetings!.length : 0
        });
        
        // Update total records on first page
        if (pageCount === 1) {
          totalRecords = (data as { total_records?: number }).total_records || 0;
        }
        
        // Add meetings from current page to all meetings
        if ((data as { meetings?: unknown[] }).meetings && Array.isArray((data as { meetings?: unknown[] }).meetings)) {
          allMeetings = allMeetings.concat((data as { meetings?: unknown[] }).meetings!);
          console.log(`📊 Total meetings collected so far: ${allMeetings.length}/${totalRecords}`);
        }
        
        // Get next page token for next iteration
        nextPageToken = (data as { next_page_token?: string }).next_page_token || null;
        
        // Small delay to avoid rate limiting
        if (nextPageToken) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } while (nextPageToken);
      
      console.log(`✅ All pages fetched! Total meetings: ${allMeetings.length}/${totalRecords}`);
      
      // If we have meetings, try to get host email for each meeting
      if (allMeetings.length > 0) {
        console.log('🔍 Fetching host email information for meetings...');
        
        // Get unique host IDs to avoid duplicate API calls
        const uniqueHostIds = [...new Set(allMeetings.map((meeting: unknown) => (meeting as { host_id: string }).host_id))];
        console.log('Unique host IDs:', uniqueHostIds);
        
        // Create a map to store host_id -> email
        const hostEmailMap: { [key: string]: string } = {};
        
        // Fetch host information for each unique host_id
        for (const hostId of uniqueHostIds) {
          try {
            const hostInfo = await this.getCurrentUser(token, hostId) as { email?: string; display_name?: string };
            if (hostInfo.email) {
              hostEmailMap[hostId] = hostInfo.email;
              console.log(`✅ Host ${hostId} email: ${hostInfo.email}`);
            }
          } catch (error) {
            console.log(`⚠️ Failed to get host info for ${hostId}:`, error);
            hostEmailMap[hostId] = 'unknown@zoom.us';
          }
        }
        
        // Add host_email to each meeting
        allMeetings = allMeetings.map((meeting: unknown) => ({
          ...(meeting as { [key: string]: unknown }),
          host_email: hostEmailMap[(meeting as { host_id: string }).host_id] || 'unknown@zoom.us'
        }));
        
        console.log('✅ Added host_email to all meetings');
      }
      
      // Return data in the same format as before, but with all meetings and user validation
      return {
        from: fromDate || new Date().toISOString().split('T')[0],
        to: toDate || new Date().toISOString().split('T')[0],
        page_count: pageCount,
        page_size: allMeetings.length,
        total_records: totalRecords,
        next_page_token: null, // No more pages
        meetings: allMeetings,
        userValidation
      };
      
    } catch (error: unknown) {
      console.log('❌ Failed to get recordings:', error instanceof Error ? error.message : 'Unknown error');
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } };
        console.log('Error response status:', axiosError.response?.status);
        console.log('Error response data:', axiosError.response?.data);
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
    } catch (error: unknown) {
      console.log('❌ Failed to get meeting recordings:', error instanceof Error ? error.message : 'Unknown error');
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } };
        console.log('Error response status:', axiosError.response?.status);
        console.log('Error response data:', axiosError.response?.data);
      }
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

  /**
   * Delete a specific recording file from a meeting or webinar
   * This is the SAFER option - only deletes the specific file, not all recordings
   * 
   * @param meetingId - The meeting ID or UUID
   * @param recordingId - The specific recording ID to delete
   * @param action - 'delete' (default) for permanent deletion or 'trash' to move to trash
   * @returns Promise<boolean> - true if successful
   */
  async deleteRecordingFile(
    meetingId: string | number, 
    recordingId: string, 
    action: 'delete' | 'trash' = 'delete'
  ): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      
      // Ensure meetingId is a string
      const meetingIdStr = String(meetingId);
      
      // Double encode UUID if it starts with / or contains //
      let encodedMeetingId = meetingIdStr;
      if (meetingIdStr.startsWith('/') || meetingIdStr.includes('//')) {
        encodedMeetingId = encodeURIComponent(encodeURIComponent(meetingIdStr));
        console.log('🔐 Double-encoded meeting ID for UUID format');
      }
      
      // Construct URL according to Zoom API specification
      // Using the exact format from the documentation: DELETE /meetings/{meetingId}/recordings/{recordingId}
      const url = `https://api.zoom.us/v2/meetings/${encodedMeetingId}/recordings/${recordingId}`;
      
      const options = {
        method: 'DELETE',
        url: url,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        params: {
          action: action
        }
      };
      
      console.log('🗑️ Deleting specific recording file...');
      console.log('📋 Meeting ID:', meetingIdStr);
      console.log('📋 Recording ID:', recordingId);
      console.log('📋 Action:', action);
      console.log('📋 URL:', url);
      
      const response = await axios.request(options);
      
      if (response.status === 204) {
        console.log('✅ Recording file deleted successfully');
        return true;
      } else {
        console.log('⚠️ Unexpected response status:', response.status);
        return false;
      }
      
    } catch (error: unknown) {
      console.error('❌ Failed to delete recording file:', error instanceof Error ? error.message : 'Unknown error');
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: unknown } };
        const status = axiosError.response?.status;
        const data = axiosError.response?.data;
        
        console.log('Error response status:', status);
        console.log('Error response data:', data);
        
        // Handle specific error codes according to Zoom API documentation
        switch (status) {
          case 400:
            if (data && typeof data === 'object' && 'code' in data) {
              const code = (data as { code: number }).code;
              switch (code) {
                case 1010:
                  throw new Error('User does not belong to this account');
                case 200:
                  throw new Error('No permission to delete recordings. Please enable "The host can delete cloud recordings" setting in your Zoom account.');
                case 3303:
                  throw new Error('You can not delete an uncompleted meeting');
                case 3310:
                  throw new Error('This recording was selected for a simulive webinar. You cannot delete or trash it.');
                default:
                  throw new Error(`Bad request: ${code}`);
              }
            }
            break;
          case 404:
            if (data && typeof data === 'object' && 'code' in data) {
              const code = (data as { code: number }).code;
              switch (code) {
                case 1001:
                  throw new Error('User does not exist or does not belong to this account');
                case 3301:
                  throw new Error('There is no recording for this meeting');
                default:
                  throw new Error(`Not found: ${code}`);
              }
            }
            break;
          case 429:
            throw new Error('Too many requests. Please try again later.');
          default:
            throw new Error(`HTTP ${status}: Failed to delete recording file`);
        }
      }
      
      throw error;
    }
  }
}