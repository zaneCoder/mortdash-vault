# MortDash - Vault

A comprehensive Zoom recordings management system with Google Cloud Storage integration.

## Features

- **Zoom Recordings Dashboard**: Fetch and view Zoom recordings with date filtering
- **File Management**: View, play, download, and upload individual files
- **Bulk Upload**: Upload all files from a meeting to Google Cloud Storage
- **Duplicate Prevention**: MongoDB tracking prevents re-uploading already uploaded files
- **Progress Tracking**: Real-time upload progress with visual feedback
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## Setup

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# MongoDB Connection (Required for duplicate prevention)
MONGODB_URI=mongodb://localhost:27017/mortdash-vault

# Zoom API Configuration
ZOOM_API_KEY=your_zoom_api_key_here
ZOOM_API_SECRET=your_zoom_api_secret_here

# Google Cloud Storage Configuration
GOOGLE_CLOUD_PROJECT_ID=your_project_id_here
GOOGLE_CLOUD_PRIVATE_KEY=your_private_key_here
GOOGLE_CLOUD_CLIENT_EMAIL=your_client_email_here
GOOGLE_CLOUD_BUCKET_NAME=your_bucket_name_here
```

### MongoDB Setup

The application uses MongoDB to track uploaded files and prevent duplicates:

1. **Install MongoDB**: Follow the [official MongoDB installation guide](https://docs.mongodb.com/manual/installation/)
2. **Start MongoDB**: `mongod --dbpath /path/to/data/db`
3. **Set MONGODB_URI**: Point to your MongoDB instance in `.env.local`

### Duplicate Prevention

The system automatically tracks uploaded files in MongoDB:

- **Uploaded Files**: Files successfully uploaded to GCS are saved to MongoDB
- **Duplicate Detection**: Upload buttons are disabled for already uploaded files
- **Visual Feedback**: Uploaded files show a green checkmark and "Uploaded" text
- **Bulk Upload**: "Upload All Files" skips already uploaded files

### Database Schema

```typescript
interface UploadedFile {
  fileId: string; // Unique file identifier from Zoom
  meetingId: number; // Meeting ID
  fileName: string; // Original file name
  fileType: string; // File type (MP4, M4A, etc.)
  fileSize: number; // File size in bytes
  gcsUrl: string; // Google Cloud Storage URL
  uploadedAt: Date; // Upload timestamp
  status: "completed" | "failed";
  error?: string; // Error message if upload failed
}
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## API Endpoints

- `POST /api/zoom` - Fetch Zoom recordings
- `GET /api/zoom/meeting/:id` - Get meeting details
- `POST /api/gcs/upload` - Upload file to Google Cloud Storage
- `GET /api/uploaded-files` - Get uploaded files for a meeting
- `POST /api/zoom/download` - Download file from Zoom

## Technologies Used

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **MongoDB** - Database for upload tracking
- **Google Cloud Storage** - File storage
- **Zoom API** - Recording management
