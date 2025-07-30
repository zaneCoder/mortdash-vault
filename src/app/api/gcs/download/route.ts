import { NextRequest, NextResponse } from 'next/server';
import { gcsAPI } from '@/lib/gcs-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    
    if (!fileName) {
      return NextResponse.json(
        { success: false, error: 'File name is required' },
        { status: 400 }
      );
    }
    
    console.log(`📥 Downloading file from GCS: ${fileName}`);
    
    const fileBuffer = await gcsAPI.downloadFile(fileName);
    
    console.log(`✅ Successfully downloaded ${fileName} from GCS`);
    
    // Get content type based on file extension
    const getContentType = (filename: string) => {
      const ext = filename.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'mp4':
          return 'video/mp4';
        case 'm4a':
          return 'audio/mp4';
        case 'pdf':
          return 'application/pdf';
        case 'txt':
          return 'text/plain';
        default:
          return 'application/octet-stream';
      }
    };
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': getContentType(fileName),
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('❌ Error downloading file from GCS:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to download file' 
      },
      { status: 500 }
    );
  }
} 