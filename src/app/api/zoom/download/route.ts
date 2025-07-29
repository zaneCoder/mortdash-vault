import { NextRequest, NextResponse } from 'next/server';
import { ZoomAPI } from '@/lib/zoom-api';

export async function POST(request: NextRequest) {
  try {
    const { fileUrl, meetingId } = await request.json();

    if (!fileUrl || !meetingId) {
      return NextResponse.json(
        { error: 'Missing required parameters: fileUrl, meetingId' },
        { status: 400 }
      );
    }

    const zoomAPI = new ZoomAPI();
    
    // Get Zoom access token
    const zoomToken = await zoomAPI.getAccessToken();
    
    // Get meeting recordings with download access token
    const recordings = await zoomAPI.getMeetingRecordings(zoomToken, meetingId);
    
    if (!recordings.download_access_token) {
      throw new Error('No download access token available for this meeting');
    }
    
    // Download file with download access token
    const response = await fetch(fileUrl, {
      headers: {
        'Authorization': `Bearer ${recordings.download_access_token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download file from Zoom: ${response.statusText} (${response.status})`);
    }

    const fileBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);

    // Return the file as a download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment',
      },
    });

  } catch (error: any) {
    console.error('Zoom Download Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 