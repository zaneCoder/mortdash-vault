import mongoose, { Schema, Document } from 'mongoose';

export interface ICourseAssignment extends Document {
  fileName: string;
  folderPath?: string;
  courseIds: string[];
  courseNames: string[];
  courseCodes: string[];
  publicUrl: string;
  fileType: string;
  fileSize: number;
  assignedAt: Date;
  assignedBy?: string;
  isActive: boolean;
}

const CourseAssignmentSchema = new Schema<ICourseAssignment>({
  fileName: {
    type: String,
    required: true,
    index: true
  },
  folderPath: {
    type: String,
    index: true
  },
  courseIds: [{
    type: String,
    required: true
  }],
  courseNames: [{
    type: String,
    required: true
  }],
  courseCodes: [{
    type: String,
    required: true
  }],
  publicUrl: {
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
  assignedAt: {
    type: Date,
    default: Date.now
  },
  assignedBy: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'course-assignments' // Explicitly set collection name with hyphens
});

// Compound index for efficient queries
CourseAssignmentSchema.index({ fileName: 1, courseIds: 1 });
CourseAssignmentSchema.index({ folderPath: 1, courseIds: 1 });

// Explicitly set the collection name in the model definition
export const CourseAssignment = mongoose.models.CourseAssignment || 
  mongoose.model<ICourseAssignment>('CourseAssignment', CourseAssignmentSchema, 'course-assignments'); 