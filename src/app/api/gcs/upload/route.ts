import { NextRequest, NextResponse } from 'next/server';
import { gcsAPI } from '@/lib/gcs-api';
import connectDB from '@/lib/mongodb';
import { UploadedFile } from '@/lib/models/UploadedFile';
import axios from 'axios';

interface RequestData {
  fileUrl: string;
  fileName: string;
  fileType: string;
  meetingId: string;
  fileId: string;
  userId?: string; // Add userId parameter
}

export async function POST(request: NextRequest) {
  let requestData: RequestData | undefined;
  
  try {
    console.log('🚀 GCS Upload API called');
    
    // Parse request data once and store it
    requestData = await request.json();
    
    if (!requestData) {
      console.error('❌ No request data provided');
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }
    
    const { fileUrl, fileName, fileType, meetingId, fileId, userId } = requestData;
    console.log('📋 Request data:', { fileUrl, fileName, fileType, meetingId, fileId, userId });

    console.log('🚀 Starting GCS upload for file:', fileId);
    console.log('📋 File details:', { fileName, fileType, meetingId });

    // Check if file is already uploaded
    try {
      console.log('🔍 Checking for existing upload in MongoDB...');
      await connectDB();
      console.log('✅ MongoDB connected for duplicate check');
      
      const existingFile = await UploadedFile.findOne({ 
        fileId, 
        meetingId: parseInt(meetingId),
        status: 'completed'
      });

      if (existingFile) {
        console.log('✅ File already uploaded:', fileId);
        return NextResponse.json({
          success: true,
          alreadyUploaded: true,
          message: 'File already uploaded to Google Cloud Storage'
        });
      } else {
        console.log('✅ No existing upload found, proceeding with upload');
      }
    } catch (dbError) {
      console.warn('⚠️ MongoDB connection failed, continuing without duplicate check:', dbError);
      // Continue with upload even if MongoDB is not available
    }

    // Get meeting recordings to get access token using relative URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    console.log('🔍 Fetching meeting recordings from:', `${baseUrl}/api/zoom/meeting/${meetingId}`);
    
    const recordingsResponse = await axios.get(`${baseUrl}/api/zoom/meeting/${meetingId}`);

    if (recordingsResponse.status !== 200) {
      console.error('❌ Failed to get meeting recordings:', recordingsResponse.status);
      return NextResponse.json(
        { error: 'Failed to get meeting recordings' },
        { status: 500 }
      );
    }

    const recordings = recordingsResponse.data.recordings;
    if (!recordings.download_access_token) {
      console.error('❌ No download access token available for this meeting');
      return NextResponse.json(
        { error: 'No download access token available for this meeting' },
        { status: 500 }
      );
    }

    console.log('✅ Got meeting recordings with access token');

    // Get user information for the path
    let userPath = 'unknown';
    let userEmail = '';
    let userDisplayName = '';
    try {
      console.log('🔍 Fetching user info from:', `${baseUrl}/api/zoom/user`);
      const userResponse = await axios.get(`${baseUrl}/api/zoom/user`);
      console.log('📡 User response status:', userResponse.status);
      console.log('📡 User response data:', userResponse.data);
      
      if (userResponse.status === 200 && userResponse.data.success) {
        const user = userResponse.data.user;
        console.log('👤 User data received:', user);
        
        // Create user path from available information
        if (user.display_name) {
          userPath = user.display_name.toLowerCase().replace(/\s+/g, '_');
          console.log('👤 Using display name:', userPath);
        } else if (user.first_name && user.last_name) {
          userPath = `${user.first_name}_${user.last_name}`.toLowerCase().replace(/\s+/g, '_');
          console.log('👤 Using first + last name:', userPath);
        } else if (user.first_name) {
          userPath = user.first_name.toLowerCase().replace(/\s+/g, '_');
          console.log('👤 Using first name only:', userPath);
        } else if (user.email) {
          userPath = user.email.split('@')[0]; // Use email prefix as fallback
          userEmail = user.email;
          console.log('📧 Using email prefix:', userPath);
        }
        userDisplayName = user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
        console.log('✅ Final user path created:', userPath);
      } else {
        console.log('❌ User response not successful:', userResponse.data);
      }
    } catch (userError) {
      console.error('❌ Failed to get user info:', userError);
      console.error('❌ Error details:', {
        name: (userError as Error).name,
        message: (userError as Error).message,
        stack: (userError as Error).stack
      });
    }

    // Download file from Zoom with authentication using axios
    console.log('📥 Downloading file from Zoom:', fileUrl);
    const fileResponse = await axios.get(fileUrl, {
      headers: {
        'Authorization': `Bearer ${recordings.download_access_token}`
      },
      responseType: 'arraybuffer'
    });

    if (fileResponse.status !== 200) {
      console.error('❌ Failed to download file from Zoom:', fileResponse.status);
      return NextResponse.json(
        { error: 'Failed to download file from Zoom' },
        { status: 500 }
      );
    }

    const fileBuffer = Buffer.from(fileResponse.data);
    console.log('📦 Downloaded file size:', fileBuffer.length, 'bytes');

    // Generate unique filename for GCS
    const timestamp = Date.now();
    
    // Use userId for folder structure if available, otherwise fall back to userPath
    let folderPath: string;
    if (userId) {
      // Create folder structure: zoom-recordings/email/topic (email lowercase, topic original case)
      const emailPrefix = userId.split('@')[0].toLowerCase(); // Ensure email prefix is lowercase
      const originalTopic = recordings.topic || 'Meeting'; // Use original topic name exactly as is
      folderPath = `zoom-recordings/${emailPrefix}/${originalTopic}`;
      console.log('📁 Using userId-based folder structure:', folderPath);
    } else {
      // Fallback to original userPath structure
      folderPath = `zoom-recordings/${userPath}/${meetingId}`;
      console.log('📁 Using fallback folder structure:', folderPath);
    }
    
    // Use the descriptive file name directly without timestamp prefix
    const uniqueFileName = `${folderPath}/${fileName}`;
    console.log('📁 Final GCS path:', uniqueFileName);

    // Determine content type based on file type
    const contentType = fileType === 'MP4' ? 'video/mp4' : 
                       fileType === 'M4A' ? 'audio/mp4' : 
                       'application/octet-stream';

    console.log('📋 Content type:', contentType);

    // Upload to Google Cloud Storage with progress tracking
    console.log('🚀 Starting GCS upload...');
    const gcsPath = await gcsAPI.uploadFileWithProgress(
      fileBuffer, 
      uniqueFileName, 
      contentType,
      (progress) => {
        console.log(`📤 Upload progress: ${progress}%`);
      }
    );

    console.log('✅ GCS upload completed, getting signed URL...');

    // Get a signed URL for the uploaded file
    const signedUrl = await gcsAPI.getFileUrl(uniqueFileName);

    console.log('✅ Got signed URL, saving to MongoDB...');

    // Save successful upload record to MongoDB
    try {
      console.log('💾 Attempting to save upload record to MongoDB...');
      console.log('📋 Upload data:', {
        fileId,
        meetingId: parseInt(meetingId),
        fileName,
        fileType,
        fileSize: fileBuffer.length,
        status: 'completed'
      });
      
      const uploadedFile = new UploadedFile({
        fileId,
        meetingId: parseInt(meetingId),
        fileName,
        fileType,
        fileSize: fileBuffer.length,
        gcsUrl: signedUrl,
        status: 'completed',
        uploadedAt: new Date(),
        userPath,
        userEmail,
        userDisplayName,
        userId // Add userId to the record
      });

      console.log('📋 Created UploadedFile instance:', uploadedFile);
      await uploadedFile.save();
      console.log('✅ Upload record saved to MongoDB successfully');
      
      // Upload records are saved to mortdash-vault collection, not logs
      // No need to create separate log entry for uploads
    } catch (dbError) {
      console.error('❌ Failed to save upload record to MongoDB:', dbError);
      console.error('❌ Error details:', {
        name: (dbError as Error).name,
        message: (dbError as Error).message,
        stack: (dbError as Error).stack
      });
      // Continue even if MongoDB save fails
    }

    console.log('✅ File uploaded to GCS:', gcsPath);
    console.log('🔗 Signed URL:', signedUrl);

    return NextResponse.json({
      success: true,
      gcsPath: gcsPath,
      signedUrl: signedUrl,
      fileName: uniqueFileName,
      message: 'File uploaded to Google Cloud Storage successfully'
    });

  } catch (error: unknown) {
    console.error('❌ GCS upload error:', error);
    console.error('❌ Error details:', {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    
    // Try to save failed upload record using stored request data
    try {
      await connectDB();
      
      if (requestData && requestData.fileId && requestData.meetingId) {
        // For failed uploads, don't include gcsUrl since it's optional for failed status
        const failedUpload = new UploadedFile({
          fileId: requestData.fileId,
          meetingId: parseInt(requestData.meetingId),
          fileName: requestData.fileName,
          fileType: requestData.fileType,
          fileSize: 0,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Upload failed',
          uploadedAt: new Date()
        });
        await failedUpload.save();
        console.log('💾 Failed upload record saved to MongoDB');
      }
    } catch (dbError) {
      console.warn('⚠️ Failed to save failed upload record to MongoDB:', dbError);
      // Continue even if MongoDB save fails
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file to Google Cloud Storage' },
      { status: 500 }
    );
  }
} 