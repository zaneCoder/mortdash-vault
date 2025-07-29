import { Storage } from '@google-cloud/storage';

// Debug environment variables (without exposing sensitive data)
console.log('🔧 GCS Configuration Debug:');
console.log('📋 Project ID:', process.env.PROJECT_ID ? '✅ Set' : '❌ Missing');
console.log('📋 Bucket Name:', process.env.GOOGLE_CLOUD_BUCKET_NAME ? '✅ Set' : '❌ Missing');
console.log('📋 Client Email:', process.env.CLIENT_EMAIL ? '✅ Set' : '❌ Missing');
console.log('📋 Private Key:', process.env.PRIVATE_KEY ? '✅ Set' : '❌ Missing');
console.log('📋 Private Key ID:', process.env.PRIVATE_KEY_ID ? '✅ Set' : '❌ Missing');

// Check if all required environment variables are present
const requiredEnvVars = {
  PROJECT_ID: process.env.PROJECT_ID,
  GOOGLE_CLOUD_BUCKET_NAME: process.env.GOOGLE_CLOUD_BUCKET_NAME,
  CLIENT_EMAIL: process.env.CLIENT_EMAIL,
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  PRIVATE_KEY_ID: process.env.PRIVATE_KEY_ID,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Missing required GCS environment variables:', missingVars);
  console.error('💡 Please set these environment variables in your deployment platform');
}

// Helper function to properly format private key
function formatPrivateKey(privateKey: string): string {
  if (!privateKey) {
    console.error('❌ PRIVATE_KEY is empty or undefined');
    return '';
  }
  
  console.log('🔐 Private key debugging:');
  console.log('📋 Original length:', privateKey.length);
  console.log('📋 Contains BEGIN:', privateKey.includes('-----BEGIN'));
  console.log('📋 Contains END:', privateKey.includes('-----END'));
  console.log('📋 Contains \\n:', privateKey.includes('\\n'));
  console.log('📋 Contains actual newlines:', privateKey.includes('\n'));
  
  // Try multiple formatting approaches
  let formatted = privateKey;
  
  // First, try to handle escaped newlines
  if (formatted.includes('\\n')) {
    formatted = formatted.replace(/\\n/g, '\n');
    console.log('📋 Applied \\n replacement');
  }
  
  // Handle other escape sequences
  formatted = formatted
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t');
  
  // Ensure proper PEM format
  if (!formatted.includes('-----BEGIN PRIVATE KEY-----')) {
    console.warn('⚠️ Private key may not be in proper PEM format');
    console.warn('📋 First 50 chars:', formatted.substring(0, 50));
    console.warn('📋 Last 50 chars:', formatted.substring(formatted.length - 50));
  }
  
  // Remove any extra whitespace
  formatted = formatted.trim();
  
  console.log('📋 Formatted length:', formatted.length);
  console.log('📋 Formatted contains newlines:', formatted.includes('\n'));
  
  return formatted;
}

// Try to create storage with better error handling
let storage: Storage;
try {
  console.log('🚀 Initializing GCS Storage...');
  
  const privateKey = formatPrivateKey(process.env.PRIVATE_KEY || '');
  
  if (!privateKey) {
    throw new Error('PRIVATE_KEY is empty or could not be formatted');
  }
  
  const credentials = {
    type: process.env.TYPE || 'service_account',
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: privateKey,
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
  };
  
  console.log('📋 Credentials prepared, creating Storage instance...');
  
  storage = new Storage({
    projectId: process.env.PROJECT_ID,
    credentials: credentials,
  });
  
  console.log('✅ GCS Storage initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize GCS Storage:', error);
  console.error('❌ Error details:', {
    name: (error as Error).name,
    message: (error as Error).message,
    stack: (error as Error).stack
  });
  
  // Check for specific OpenSSL errors during initialization
  if ((error as Error).message?.includes('ERR_OSSL_UNSUPPORTED') || 
      (error as Error).message?.includes('DECODER routines') ||
      (error as Error).message?.includes('unsupported')) {
    console.error('🔐 OpenSSL Error during initialization - private key format issue');
    console.error('💡 Try these solutions:');
    console.error('💡 1. Use raw format in deployment: PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----');
    console.error('💡 2. Use base64 encoding: PRIVATE_KEY_BASE64=[base64-encoded-key]');
    console.error('💡 3. Check if your deployment platform has character limits');
  }
  
  throw new Error('Failed to initialize Google Cloud Storage');
}

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'mortdash-vault';

export class GCSAPI {
  private bucket;

  constructor() {
    this.bucket = storage.bucket(bucketName);
  }

  async uploadFile(fileBuffer: Buffer, fileName: string, contentType: string): Promise<string> {
    try {
      console.log('🚀 Starting GCS upload for:', fileName);
      console.log('📦 File size:', fileBuffer.length, 'bytes');
      console.log('📋 Content type:', contentType);
      console.log('📋 Bucket name:', bucketName);
      
      const file = this.bucket.file(fileName);
      
      await file.save(fileBuffer, {
        metadata: {
          contentType: contentType,
        },
        resumable: false,
      });

      console.log('✅ GCS upload completed for:', fileName);
      // Return the file URL (will be private, use signed URLs for access)
      return `gs://${bucketName}/${fileName}`;
    } catch (error) {
      console.error('❌ GCS upload error:', error);
      console.error('❌ Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      
      // Check for specific OpenSSL errors
      if ((error as Error).message?.includes('ERR_OSSL_UNSUPPORTED') || 
          (error as Error).message?.includes('DECODER routines') ||
          (error as Error).message?.includes('unsupported')) {
        console.error('🔐 OpenSSL Error detected - this is a private key format issue');
        console.error('💡 Solution: Check that your PRIVATE_KEY environment variable is properly formatted');
        console.error('💡 The private key should be in PEM format with proper newlines');
        console.error('💡 Example format: -----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----');
        console.error('💡 Alternative: Try using the raw key format without escaping');
      }
      
      // Check for authentication errors
      if ((error as Error).message?.includes('authentication') || (error as Error).message?.includes('unauthorized')) {
        console.error('🔐 Authentication Error detected');
        console.error('💡 Solution: Check your service account credentials and permissions');
      }
      
      throw new Error('Failed to upload file to Google Cloud Storage');
    }
  }

  async uploadFileWithProgress(
    fileBuffer: Buffer, 
    fileName: string, 
    contentType: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      console.log('🚀 Starting GCS upload with progress for:', fileName);
      console.log('📦 File size:', fileBuffer.length, 'bytes');
      console.log('📋 Content type:', contentType);
      console.log('📋 Bucket name:', bucketName);
      
      const file = this.bucket.file(fileName);
      
      // Use resumable upload for progress tracking
      await file.save(fileBuffer, {
        metadata: {
          contentType: contentType,
        },
        resumable: true,
        onUploadProgress: (progressEvent: { totalBytes?: number; bytesWritten?: number }) => {
          if (onProgress && progressEvent.totalBytes && progressEvent.bytesWritten) {
            const progress = Math.round((progressEvent.bytesWritten / progressEvent.totalBytes) * 100);
            onProgress(progress);
          }
        },
      });

      console.log('✅ GCS upload with progress completed for:', fileName);
      // Return the file URL (will be private, use signed URLs for access)
      return `gs://${bucketName}/${fileName}`;
    } catch (error) {
      console.error('❌ GCS upload with progress error:', error);
      console.error('❌ Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      
      // Check for specific OpenSSL errors
      if ((error as Error).message?.includes('ERR_OSSL_UNSUPPORTED') || 
          (error as Error).message?.includes('DECODER routines') ||
          (error as Error).message?.includes('unsupported')) {
        console.error('🔐 OpenSSL Error detected - this is a private key format issue');
        console.error('💡 Solution: Check that your PRIVATE_KEY environment variable is properly formatted');
        console.error('💡 The private key should be in PEM format with proper newlines');
        console.error('💡 Example format: -----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----');
        console.error('💡 Alternative: Try using the raw key format without escaping');
      }
      
      // Check for authentication errors
      if ((error as Error).message?.includes('authentication') || (error as Error).message?.includes('unauthorized')) {
        console.error('🔐 Authentication Error detected');
        console.error('💡 Solution: Check your service account credentials and permissions');
      }
      
      throw new Error('Failed to upload file to Google Cloud Storage');
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    try {
      const [files] = await this.bucket.getFiles({ prefix });
      return files.map(file => file.name);
    } catch (error) {
      console.error('GCS list files error:', error);
      throw new Error('Failed to list files from Google Cloud Storage');
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      await this.bucket.file(fileName).delete();
    } catch (error) {
      console.error('GCS delete error:', error);
      throw new Error('Failed to delete file from Google Cloud Storage');
    }
  }

  async getFileUrl(fileName: string): Promise<string> {
    try {
      const [url] = await this.bucket.file(fileName).getSignedUrl({
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });
      return url;
    } catch (error) {
      console.error('GCS get URL error:', error);
      throw new Error('Failed to get file URL from Google Cloud Storage');
    }
  }
}

export const gcsAPI = new GCSAPI(); 