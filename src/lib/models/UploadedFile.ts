import mongoose, { Schema, Document } from 'mongoose';

export interface IUploadedFile extends Document {
  fileId: string;
  meetingId: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  gcsUrl?: string; // Make optional since failed uploads won't have a URL
  uploadedAt: Date;
  status: 'completed' | 'failed';
  error?: string;
  userPath?: string;
  userEmail?: string;
  userDisplayName?: string;
}

const UploadedFileSchema = new Schema<IUploadedFile>({
  fileId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  meetingId: {
    type: Number,
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  gcsUrl: {
    type: String,
    required: function(this: IUploadedFile) {
      // Only require gcsUrl for completed uploads
      return this.status === 'completed';
    }
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['completed', 'failed'],
    default: 'completed'
  },
  error: {
    type: String
  },
  userPath: {
    type: String
  },
  userEmail: {
    type: String
  },
  userDisplayName: {
    type: String
  }
});

// Compound index for efficient queries
UploadedFileSchema.index({ meetingId: 1, fileId: 1 });

export const UploadedFile = mongoose.models.UploadedFile || mongoose.model<IUploadedFile>('UploadedFile', UploadedFileSchema, 'mortdash-vault'); 