# Google Cloud Storage Setup Guide

## Prerequisites

1. **Google Cloud Account**: You need a Google Cloud account
2. **Google Cloud Project**: Create a new project or use an existing one
3. **Billing**: Enable billing for your project

## Step 1: Create a Google Cloud Storage Bucket

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **Cloud Storage** > **Buckets**
4. Click **Create Bucket**
5. Choose a unique bucket name (e.g., `mortdash-vault`)
6. Configure settings:
   - **Location**: Choose a region close to your users
   - **Storage class**: Standard
   - **Access control**: Uniform
   - **Protection tools**: None (for this demo)

## Step 2: Create a Service Account

1. In the Google Cloud Console, go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name: `mortdash-vault-service`
4. Description: `Service account for MortDash Vault GCS uploads`
5. Click **Create and Continue**

## Step 3: Grant Permissions

1. For the service account, add these roles:
   - **Storage Object Admin** (for upload/delete operations)
   - **Storage Object Viewer** (for read operations)
2. Click **Done**

## Step 4: Create and Download Key

1. Click on your service account
2. Go to the **Keys** tab
3. Click **Add Key** > **Create New Key**
4. Choose **JSON** format
5. Download the key file
6. **Important**: Keep this file secure and never commit it to version control

## Step 5: Configure Environment Variables

Create or update your `.env.local` file:

```env
# Google Cloud Storage Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_BUCKET_NAME=mortdash-vault
GOOGLE_CLOUD_KEY_FILE=./path/to/your/service-account-key.json
```

## Step 6: Place the Key File

1. Place your downloaded service account key file in your project
2. Update the `GOOGLE_CLOUD_KEY_FILE` path in your `.env.local`
3. **Important**: Add the key file to your `.gitignore`:

```gitignore
# Google Cloud Service Account Key
*.json
!package.json
!package-lock.json
```

## Step 7: Test the Setup

1. Start your development server: `npm run dev`
2. Navigate to a meeting's files page
3. Try uploading a file to Google Cloud Storage
4. Check the Google Cloud Console to see the uploaded files

## File Structure in GCS

Files will be uploaded to this structure:

```
zoom-recordings/
├── {meeting-id}/
│   ├── {timestamp}_{filename}.mp4
│   ├── {timestamp}_{filename}.m4a
│   └── ...
```

## Security Best Practices

1. **Never commit service account keys** to version control
2. **Use environment variables** for all sensitive configuration
3. **Limit permissions** to only what's needed
4. **Regularly rotate** service account keys
5. **Monitor usage** in Google Cloud Console

## Troubleshooting

### Common Issues:

1. **"Permission denied"**: Check service account permissions
2. **"Bucket not found"**: Verify bucket name and project ID
3. **"Invalid key file"**: Ensure the key file path is correct
4. **"Project not found"**: Verify your project ID

### Debug Steps:

1. Check environment variables are loaded
2. Verify service account key file exists
3. Test bucket access in Google Cloud Console
4. Check application logs for detailed error messages

## Production Deployment

For production, consider:

1. **Using Google Cloud Run** or **App Engine** for automatic authentication
2. **Storing keys securely** in Google Secret Manager
3. **Setting up proper IAM roles** for your deployment environment
4. **Configuring CORS** if needed for direct browser uploads
5. **Setting up monitoring** and alerting

## Cost Optimization

1. **Choose appropriate storage class** based on access patterns
2. **Set up lifecycle policies** to move files to cheaper storage
3. **Monitor usage** and set up billing alerts
4. **Consider regional storage** to reduce latency and costs
