import { NextRequest, NextResponse } from 'next/server';
import { ZoomAPI } from '@/lib/zoom-api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, fromDate, toDate } = body;
    
    console.log('📅 API received dates:', { fromDate, toDate });
    console.log('👤 API received userId:', userId);
    
    const zoomAPI = new ZoomAPI();
    const accessToken = await zoomAPI.getAccessToken();
    
    // Get recordings with validation
    const recordings = await zoomAPI.getListMeetings(accessToken, fromDate, toDate, userId);
    
    return NextResponse.json({
      success: true,
      meetings: recordings,
      userValidation: recordings.userValidation,
      message: 'Successfully fetched recordings from Zoom API'
    });
    
  } catch (error: unknown) {
    console.error('❌ API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recordings';
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: 500 }
    );
  }
} 