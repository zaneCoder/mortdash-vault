import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { UploadedFile } from '@/lib/models/UploadedFile';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get('meetingId');
  const meetingIds = searchParams.get('meetingIds'); // New parameter for multiple IDs
  
  // Quick check: if using localhost and no MongoDB URI, skip immediately
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mortdash';
  if (mongoUri.includes('localhost') && !process.env.MONGODB_URI) {
    console.log('⚠️ Using local MongoDB without proper setup, returning empty results');
    return NextResponse.json({
      success: true,
      uploadedFiles: []
    });
  }
  
  try {
    await connectDB();
    
    let uploadedFiles;
    
    if (meetingIds) {
      // Handle multiple meeting IDs
      const ids = meetingIds.split(',').map(id => parseInt(id.trim()));
      console.log('🔍 Fetching uploaded files for multiple meetingIds:', ids);
      
      uploadedFiles = await UploadedFile.find({
        meetingId: { $in: ids },
        status: 'completed'
      }).select('fileId fileName fileType uploadedAt status meetingId');
      
      console.log('📋 Found uploaded files for multiple meetings:', uploadedFiles.length);
    } else if (meetingId) {
      // Handle single meeting ID (backward compatibility)
      console.log('🔍 Fetching uploaded files for meetingId:', meetingId);
      
      uploadedFiles = await UploadedFile.find({
        meetingId: parseInt(meetingId),
        status: 'completed'
      }).select('fileId fileName fileType uploadedAt status');
      
      console.log('📋 Found uploaded files:', uploadedFiles.length);
    } else {
      return NextResponse.json(
        { error: 'Meeting ID or Meeting IDs are required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      uploadedFiles
    });

  } catch (error) {
    console.error('Error fetching uploaded files:', error);
    
    // If MongoDB connection fails, return empty results immediately
    if (error instanceof Error && (
      error.message.includes('buffering timed out') ||
      error.message.includes('buffermaxentries is not supported') ||
      error.message.includes('MongoParseError') ||
      error.message.includes('MongooseServerSelectionError') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('Cannot call') ||
      error.message.includes('timeout') ||
      error.message.includes('connection')
    )) {
      console.log('⚠️ MongoDB connection issue, returning empty results');
      return NextResponse.json({
        success: true,
        uploadedFiles: []
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch uploaded files' },
      { status: 500 }
    );
  }
} 