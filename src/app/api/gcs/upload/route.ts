import { NextRequest, NextResponse } from 'next/server';
import { gcsAPI } from '@/lib/gcs-api';
import { ZoomAPI } from '@/lib/zoom-api';

const zoomAPI = new ZoomAPI();

export async function POST(request: NextRequest) {
  try {
    const { fileUrl, fileName, fileType, meetingId } = await request.json();

    if (!fileUrl || !fileName || !fileType || !meetingId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting GCS upload for:', fileName);
    console.log('🔗 File URL:', fileUrl);
    console.log('📋 Meeting ID:', meetingId);

    // Get Zoom access token
    const zoomToken = await zoomAPI.getAccessToken();
    if (!zoomToken) {
      return NextResponse.json(
        { error: 'Failed to get Zoom access token' },
        { status: 500 }
      );
    }

    // Get meeting recordings to get download access token
    const recordings = await zoomAPI.getMeetingRecordings(zoomToken, meetingId);
    if (!recordings || !recordings.download_access_token) {
      return NextResponse.json(
        { error: 'Failed to get meeting recordings or download access token' },
        { status: 500 }
      );
    }

    // Download file from Zoom with authentication
    const response = await fetch(fileUrl, {
      headers: {
        'Authorization': `Bearer ${recordings.download_access_token}`
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to download file from Zoom' },
        { status: 500 }
      );
    }

    const fileBuffer = Buffer.from(await response.arrayBuffer());
    console.log('📦 Downloaded file size:', fileBuffer.length, 'bytes');

    // Generate unique filename for GCS
    const timestamp = Date.now();
    const uniqueFileName = `zoom-recordings/${meetingId}/${timestamp}_${fileName}`;

    // Determine content type based on file type
    const contentType = fileType === 'MP4' ? 'video/mp4' : 
                       fileType === 'M4A' ? 'audio/mp4' : 
                       'application/octet-stream';

    // Upload to Google Cloud Storage
    const gcsPath = await gcsAPI.uploadFile(fileBuffer, uniqueFileName, contentType);

    // Get a signed URL for the uploaded file
    const signedUrl = await gcsAPI.getFileUrl(uniqueFileName);

    console.log('✅ File uploaded to GCS:', gcsPath);
    console.log('🔗 Signed URL:', signedUrl);

    return NextResponse.json({
      success: true,
      gcsPath: gcsPath,
      signedUrl: signedUrl,
      fileName: uniqueFileName,
      message: 'File uploaded to Google Cloud Storage successfully'
    });

  } catch (error: any) {
    console.error('❌ GCS upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file to Google Cloud Storage' },
      { status: 500 }
    );
  }
} 