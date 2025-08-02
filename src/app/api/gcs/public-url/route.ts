import { NextRequest, NextResponse } from 'next/server';
import { gcsAPI } from '@/lib/gcs-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    
    if (!fileName) {
      return NextResponse.json(
        { error: 'fileName parameter is required' },
        { status: 400 }
      );
    }
    
    console.log('🔗 Generating public URL for file:', fileName);
    
    // Get the public URL from GCS API
    const publicUrl = await gcsAPI.getPublicUrl(fileName);
    
    console.log('✅ Public URL generated:', publicUrl);
    
    return NextResponse.json({
      success: true,
      publicUrl: publicUrl,
      message: 'Public URL generated successfully'
    });
    
  } catch (error: unknown) {
    console.error('❌ Failed to generate public URL:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate public URL' },
      { status: 500 }
    );
  }
} 