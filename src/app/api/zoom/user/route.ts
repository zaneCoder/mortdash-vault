import { NextResponse } from 'next/server';
import { ZoomAPI } from '@/lib/zoom-api';

const zoomAPI = new ZoomAPI();

export async function GET() {
  try {
    console.log('🔍 Fetching current user info');

    const userInfo = await zoomAPI.getUserInfo();

    console.log('✅ User info fetched successfully');
    console.log('User data:', userInfo);

    return NextResponse.json({
      success: true,
      user: userInfo
    });

  } catch (error: unknown) {
    console.error('❌ Error fetching user info:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user information';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 