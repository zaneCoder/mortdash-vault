#!/usr/bin/env node

require('dotenv').config();
const { Storage } = require('@google-cloud/storage');

// Initialize Google Cloud Storage with hardcoded credentials from .env
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: {
    type: process.env.TYPE || 'service_account',
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: process.env.PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
  },
});

async function createBucket() {
  try {
    const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'mortdash-vault';
    
    console.log(`🚀 Creating bucket: ${bucketName}`);
    console.log(`📋 Project ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`);
    console.log(`📧 Client Email: ${process.env.CLIENT_EMAIL}`);
    
    // Create the bucket
    const [bucket] = await storage.createBucket(bucketName, {
      location: 'us-central1', // You can change this to your preferred region
      storageClass: 'STANDARD',
    });
    
    console.log(`✅ Bucket created successfully: ${bucket.name}`);
    console.log(`🔗 Bucket URL: https://storage.googleapis.com/${bucket.name}`);
    
  } catch (error) {
    if (error.code === 409) {
      console.log('✅ Bucket already exists!');
    } else {
      console.error('❌ Error creating bucket:', error.message);
      console.log('\n📋 Make sure:');
      console.log('1. Your service account has Storage Admin permissions');
      console.log('2. Your project has billing enabled');
      console.log('3. The Cloud Storage API is enabled');
    }
  }
}

createBucket(); 