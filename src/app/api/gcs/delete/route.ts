import { NextRequest, NextResponse } from 'next/server';
import { gcsAPI } from '@/lib/gcs-api';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName } = body;
    
    if (!fileName) {
      return NextResponse.json(
        { success: false, error: 'File name is required' },
        { status: 400 }
      );
    }
    
    console.log(`🗑️ Deleting file from GCS: ${fileName}`);
    
    await gcsAPI.deleteFile(fileName);
    
    console.log(`✅ Successfully deleted ${fileName} from GCS`);
    
    return NextResponse.json({
      success: true,
      message: `File ${fileName} deleted successfully`
    });
  } catch (error) {
    console.error('❌ Error deleting file from GCS:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete file' 
      },
      { status: 500 }
    );
  }
} 