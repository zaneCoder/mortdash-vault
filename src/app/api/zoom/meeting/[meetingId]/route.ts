import { NextRequest, NextResponse } from 'next/server';
import { ZoomAPI } from '@/lib/zoom-api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    // Check if ZOOM_KEY is configured
    if (!process.env.ZOOM_KEY) {
      return NextResponse.json(
        { error: 'Missing ZOOM_KEY environment variable' },
        { status: 500 }
      );
    }

    const zoomAPI = new ZoomAPI();

    // Get access token first
    const accessToken = await zoomAPI.getAccessToken();
    
    // Get meeting recordings
    const recordings = await zoomAPI.getMeetingRecordings(accessToken, meetingId);

    return NextResponse.json({
      success: true,
      recordings: recordings,
      message: 'Successfully fetched meeting recordings'
    });

  } catch (error: unknown) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 