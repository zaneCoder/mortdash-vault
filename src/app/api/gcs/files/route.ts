import { NextResponse } from 'next/server';
import { gcsAPI } from '@/lib/gcs-api';

export async function GET() {
  try {
    console.log('📋 Fetching files from Google Cloud Storage...');
    
    const files = await gcsAPI.listFilesWithDetails();
    
    console.log(`✅ Successfully fetched ${files.length} files from GCS`);
    
    return NextResponse.json({
      success: true,
      files: files
    });
  } catch (error) {
    console.error('❌ Error fetching files from GCS:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch files' 
      },
      { status: 500 }
    );
  }
} 