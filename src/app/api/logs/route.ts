import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, Db, Document } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mongo:Gf7AAx0f18r8hS2r@mortdash.itaar93.mongodb.net/mortdash-vault?retryWrites=true&w=majority&appName=Mortdash';

interface UploadedFile extends Document {
  fileSize?: number;
  uploadedAt: string;
}

interface LogEntry extends Document {
  action?: string;
  fileName?: string;
  fileSize?: number;
  timestamp: string;
  status?: string;
}

async function connectToDatabase() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('mortdash-vault'); // Updated to match your database name
  return { db, client };
}

export async function GET() {
  let client: MongoClient | null = null;
  
  try {
    console.log('🔍 Starting logs API request...');
    console.log('📋 MongoDB URI:', MONGODB_URI ? '✅ Set' : '❌ Missing');
    
    const connection = await connectToDatabase();
    client = connection.client;
    const { db } = connection;
    
    console.log('✅ Connected to MongoDB database');
    console.log('📋 Database name:', db.databaseName);
    console.log('📋 Available collections:', await db.listCollections().toArray().then(cols => cols.map(c => c.name)));
    
    // Get logs from various collections that store activity
    console.log('📥 Fetching mortdash-vault collection...');
    const uploadedFiles = await db.collection('mortdash-vault').find({}).toArray();
    console.log(`📊 Found ${uploadedFiles.length} uploaded files`);
    
    console.log('📥 Fetching logs collection...');
    const logs = await db.collection('logs').find({}).toArray();
    console.log(`📊 Found ${logs.length} log entries`);
    
    // Combine and format activity logs from different sources
    const activityLogs: Array<{
      _id: unknown;
      action: string;
      fileName?: string;
      fileSize?: number;
      timestamp: string;
      status: string;
    }> = [];
    
    // Add upload logs from uploadedFiles collection
    console.log('🔄 Processing uploadedFiles data...');
    uploadedFiles.forEach((file) => {
      console.log(`📁 Processing file: ${file.fileName} (${file.fileSize} bytes)`);
      activityLogs.push({
        _id: file._id,
        action: 'upload',
        fileName: file.fileName,
        fileSize: file.fileSize,
        timestamp: file.uploadedAt,
        status: 'success'
      });
    });
    
    // Add other logs from logs collection
    console.log('🔄 Processing logs collection data...');
    logs.forEach((log) => {
      console.log(`📝 Processing log: ${log.action} - ${log.fileName || 'no filename'}`);
      activityLogs.push({
        _id: log._id,
        action: log.action || 'unknown',
        fileName: log.fileName,
        fileSize: log.fileSize,
        timestamp: log.timestamp,
        status: log.status || 'success'
      });
    });
    
    // Sort by timestamp (newest first)
    console.log('📅 Sorting activity logs by timestamp...');
    activityLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Limit to 100 most recent entries
    const recentLogs = activityLogs.slice(0, 100);
    console.log(`📊 Final activity logs count: ${recentLogs.length}`);

    // Get database statistics
    console.log('📈 Getting database statistics...');
    const stats = await getDatabaseStats(db);
    console.log('📊 Database stats:', stats);

    console.log('✅ Logs API request completed successfully');
    return NextResponse.json({
      success: true,
      logs: recentLogs,
      stats
    });

  } catch (error) {
    console.error('❌ Failed to fetch logs:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

async function getDatabaseStats(db: Db) {
  try {
    console.log('📊 Starting database statistics calculation...');
    
    // Get uploaded files count and total size
    console.log('📥 Counting mortdash-vault collection...');
    const uploadedFiles = await db.collection('mortdash-vault').find({}).toArray() as unknown as UploadedFile[];
    const totalFiles = uploadedFiles.length;
    const totalSize = uploadedFiles.reduce((sum: number, file: UploadedFile) => {
      return sum + (file.fileSize || 0);
    }, 0);
    console.log(`📊 mortdash-vault: ${totalFiles} files, ${totalSize} total bytes`);

    // Get action counts from logs
    console.log('📥 Counting logs collection...');
    const logs = await db.collection('logs').find({}).toArray() as unknown as LogEntry[];
    const uploadCount = logs.filter((log: LogEntry) => {
      return log.action?.toLowerCase().includes('upload');
    }).length;
    const downloadCount = logs.filter((log: LogEntry) => {
      return log.action?.toLowerCase().includes('download');
    }).length;
    const deleteCount = logs.filter((log: LogEntry) => {
      return log.action?.toLowerCase().includes('delete');
    }).length;
    console.log(`📊 Logs: ${uploadCount} uploads, ${downloadCount} downloads, ${deleteCount} deletes`);

    // Get last activity timestamp from mortdash-vault (since that's where your data is)
    console.log('📅 Finding last activity timestamp...');
    const lastUploadedFile = await db.collection('mortdash-vault')
      .find({})
      .sort({ uploadedAt: -1 })
      .limit(1)
      .toArray() as unknown as UploadedFile[];

    const lastActivity = lastUploadedFile.length > 0 ? lastUploadedFile[0].uploadedAt : new Date().toISOString();
    console.log(`📅 Last activity: ${lastActivity}`);

    const stats = {
      totalFiles,
      totalSize,
      uploadCount,
      downloadCount,
      deleteCount,
      lastActivity
    };
    
    console.log('📊 Final database stats:', stats);
    return stats;

  } catch (error) {
    console.error('❌ Failed to get database stats:', error);
    return {
      totalFiles: 0,
      totalSize: 0,
      uploadCount: 0,
      downloadCount: 0,
      deleteCount: 0,
      lastActivity: new Date().toISOString()
    };
  }
}

// POST method to add a new log entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, meetingId, fileName, fileSize, status, details } = body;

    const { db } = await connectToDatabase();

    const logEntry = {
      action,
      meetingId,
      fileName,
      fileSize,
      status: status || 'success',
      details,
      timestamp: new Date().toISOString()
    };

    await db.collection('logs').insertOne(logEntry);

    return NextResponse.json({
      success: true,
      message: 'Log entry created successfully'
    });

  } catch (error) {
    console.error('❌ Failed to create log entry:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create log entry',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}