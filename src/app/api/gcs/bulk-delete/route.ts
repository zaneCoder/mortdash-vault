import { NextRequest, NextResponse } from 'next/server';
import { gcsAPI } from '@/lib/gcs-api';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileNames } = body;
    
    if (!fileNames || !Array.isArray(fileNames) || fileNames.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File names array is required' },
        { status: 400 }
      );
    }
    
    console.log(`🗑️ Bulk deleting ${fileNames.length} files from GCS:`, fileNames);
    
    const deletePromises = fileNames.map(async (fileName: string) => {
      try {
        await gcsAPI.deleteFile(fileName);
        return { success: true, fileName };
      } catch (error) {
        console.error(`❌ Failed to delete ${fileName}:`, error);
        return { success: false, fileName, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });
    
    const results = await Promise.allSettled(deletePromises);
    
    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;
    
    const failed = results.filter(result => 
      result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)
    ).length;
    
    console.log(`✅ Bulk delete completed: ${successful} successful, ${failed} failed`);
    
    return NextResponse.json({
      success: true,
      message: `Bulk delete completed: ${successful} successful, ${failed} failed`,
      results: {
        total: fileNames.length,
        successful,
        failed
      }
    });
  } catch (error) {
    console.error('❌ Error bulk deleting files from GCS:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to bulk delete files' 
      },
      { status: 500 }
    );
  }
} 