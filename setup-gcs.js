#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Google Cloud Storage Setup Helper\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('❌ .env.local file not found!');
  console.log('\n📝 Please create a .env.local file with the following variables:\n');
  console.log('# Google Cloud Storage Configuration');
  console.log('GOOGLE_CLOUD_PROJECT_ID=your-google-cloud-project-id');
  console.log('GOOGLE_CLOUD_BUCKET_NAME=your-bucket-name');
  console.log('GOOGLE_CLOUD_KEY_FILE=./path/to/your/service-account-key.json');
  console.log('\n🔗 Follow the setup guide in GCS_SETUP.md');
} else {
  console.log('✅ .env.local file found');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check for GCS variables
  const hasProjectId = envContent.includes('GOOGLE_CLOUD_PROJECT_ID');
  const hasBucketName = envContent.includes('GOOGLE_CLOUD_BUCKET_NAME');
  const hasKeyFile = envContent.includes('GOOGLE_CLOUD_KEY_FILE');
  
  console.log('\n📋 Environment Variables Status:');
  console.log(`GOOGLE_CLOUD_PROJECT_ID: ${hasProjectId ? '✅' : '❌'}`);
  console.log(`GOOGLE_CLOUD_BUCKET_NAME: ${hasBucketName ? '✅' : '❌'}`);
  console.log(`GOOGLE_CLOUD_KEY_FILE: ${hasKeyFile ? '✅' : '❌'}`);
  
  if (!hasProjectId || !hasBucketName || !hasKeyFile) {
    console.log('\n❌ Missing required environment variables!');
    console.log('\n📝 Add these to your .env.local file:');
    console.log('GOOGLE_CLOUD_PROJECT_ID=your-google-cloud-project-id');
    console.log('GOOGLE_CLOUD_BUCKET_NAME=your-bucket-name');
    console.log('GOOGLE_CLOUD_KEY_FILE=./path/to/your/service-account-key.json');
  } else {
    console.log('\n✅ All GCS environment variables are configured!');
    console.log('\n📋 Next steps:');
    console.log('1. Create your Google Cloud Storage bucket');
    console.log('2. Set up service account and download key file');
    console.log('3. Update the key file path in .env.local');
    console.log('4. Test the upload functionality');
  }
}

console.log('\n📖 For detailed setup instructions, see GCS_SETUP.md'); 