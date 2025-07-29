# Zoom Recordings Dashboard

A Next.js application that connects to the Zoom API to fetch meeting recordings and display them in a user-friendly dashboard.

## Features

- 🔐 Secure Zoom API integration with OAuth authentication
- 📅 Date range filtering for recordings
- 👤 User-specific recording retrieval
- 📊 Progress indicators for API operations
- 🎥 Detailed recording information display
- 💾 Direct download links for recordings
- 📱 Responsive design for all devices
- 🔧 Environment-based configuration

## Prerequisites

Before using this application, you need:

1. **Zoom Developer Account**: Create an account at [Zoom Marketplace](https://marketplace.zoom.us/)
2. **Zoom App**: Create a Server-to-Server OAuth App in the Zoom Marketplace
3. **API Credentials**: Get your Account ID, Client ID, and Client Secret from the Zoom App

## Setup Instructions

### 1. Get Zoom API Credentials

1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Sign in with your Zoom account
3. Click "Develop" → "Build App"
4. Choose "Server-to-Server OAuth" as the app type
5. Fill in the required information:
   - App name: "Recordings Dashboard"
   - App type: "Meeting"
   - User authorization type: "Server-to-Server OAuth"
6. After creating the app, go to "App Credentials"
7. Copy your **Account ID**, **Client ID**, and **Client Secret**

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Zoom API Configuration
ZOOM_ACCOUNT_ID=your_zoom_account_id
ZOOM_KEY=your_zoom_client_id
ZOOM_SECRET=your_zoom_client_secret
ZOOM_GRANT_TYPE=account_credentials
ZOOM_API_URL=https://api.zoom.us/v2
ZOOM_AUTH_URL=https://zoom.us/oauth/token
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### 1. Configure Recording Fetch

1. Enter the **User ID** (email address or user ID) for the user whose recordings you want to fetch
2. Select the **From Date** and **To Date** for the date range
3. Click "Fetch Recordings" to start the process

### 2. View and Download Recordings

- Each meeting shows detailed information including topic, host, duration, and start time
- Recording files are listed with file type, size, and status
- Click "Download" to open the recording file in a new tab

## API Endpoints

### POST /api/zoom

Fetches meeting recordings from Zoom API.

**Request Body:**
```json
{
  "userId": "user@example.com",
  "fromDate": "2024-01-01",
  "toDate": "2024-01-31"
}
```

**Response:**
```json
{
  "meetings": [
    {
      "id": "meeting_id",
      "topic": "Meeting Topic",
      "start_time": "2024-01-01T10:00:00Z",
      "end_time": "2024-01-01T11:00:00Z",
      "duration": 60,
      "host_email": "host@example.com",
      "recordings": [
        {
          "id": "recording_id",
          "file_type": "MP4",
          "file_size": 1048576,
          "download_url": "https://...",
          "status": "completed"
        }
      ]
    }
  ]
}
```

## Technical Details

### Zoom API Integration

The application uses the Zoom API v2 with OAuth authentication:

- **Authentication**: OAuth tokens generated from Client ID and Secret
- **Endpoint**: `/users/{userId}/recordings`
- **Rate Limits**: Respects Zoom API rate limits
- **Error Handling**: Comprehensive error handling for API failures

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ZOOM_ACCOUNT_ID` | Your Zoom Account ID | Yes |
| `ZOOM_KEY` | Your Zoom Client ID | Yes |
| `ZOOM_SECRET` | Your Zoom Client Secret | Yes |
| `ZOOM_GRANT_TYPE` | OAuth grant type (default: account_credentials) | No |
| `ZOOM_API_URL` | Zoom API base URL | No |
| `ZOOM_AUTH_URL` | Zoom OAuth token URL | No |

### Frontend Features

- **Form Validation**: React Hook Form for robust form handling
- **Progress Tracking**: Real-time progress indicators
- **Responsive Design**: Tailwind CSS for mobile-first design
- **Type Safety**: TypeScript for better development experience

## Security Considerations

- API credentials are stored securely in environment variables
- No credentials are exposed in the frontend
- All API calls are made server-side to protect credentials
- HTTPS is required for production deployment

## Troubleshooting

### Common Issues

1. **"Missing environment variables"**
   - Ensure all required environment variables are set in `.env.local`
   - Restart the development server after adding environment variables

2. **"Invalid Zoom credentials"**
   - Verify your Account ID, Client ID, and Client Secret are correct
   - Ensure your Zoom App is properly configured with Server-to-Server OAuth

3. **"No recordings found"**
   - Check that the user has recordings in the specified date range
   - Verify the user ID is correct (use email address)

4. **"Rate limit exceeded"**
   - Wait a few minutes before making another request
   - Consider reducing the date range

### Getting Help

- Check the [Zoom API Documentation](https://developers.zoom.us/docs/api/)
- Review the [Zoom API Reference](https://marketplace.zoom.us/docs/api-reference/zoom-api)

## Development

### Project Structure

```
src/
├── app/
│   ├── api/zoom/route.ts    # Zoom API endpoint
│   ├── page.tsx             # Main dashboard
│   └── layout.tsx           # App layout
├── lib/
│   └── zoom-api.ts          # Zoom API utilities
└── components/              # React components
```

### Adding Cloud Storage

To add cloud storage functionality:

1. Install cloud storage SDKs (AWS S3, Google Cloud Storage)
2. Create storage configuration
3. Add upload progress tracking
4. Implement file upload to cloud storage

## License

This project is licensed under the MIT License.
