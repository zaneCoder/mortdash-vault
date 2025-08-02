import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { CourseAssignment } from '@/lib/models/CourseAssignment';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { 
      fileName, 
      folderPath, 
      courseIds, 
      courseNames, 
      courseCodes, 
      publicUrl, 
      fileType, 
      fileSize, 
      assignedBy 
    } = body;

    // Validate required fields
    if (!fileName || !courseIds || !courseNames || !courseCodes || !publicUrl || !fileType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if assignment already exists
    const existingAssignment = await CourseAssignment.findOne({
      fileName,
      isActive: true
    });

    if (existingAssignment) {
      // Update existing assignment with new courses
      const updatedCourseIds = [...new Set([...existingAssignment.courseIds, ...courseIds])];
      const updatedCourseNames = [...new Set([...existingAssignment.courseNames, ...courseNames])];
      const updatedCourseCodes = [...new Set([...existingAssignment.courseCodes, ...courseCodes])];

      const updatedAssignment = await CourseAssignment.findByIdAndUpdate(
        existingAssignment._id,
        {
          courseIds: updatedCourseIds,
          courseNames: updatedCourseNames,
          courseCodes: updatedCourseCodes,
          publicUrl,
          assignedAt: new Date()
        },
        { new: true }
      );

      return NextResponse.json({
        success: true,
        message: 'Course assignment updated successfully',
        assignment: updatedAssignment
      });
    }

    // Create new assignment
    const assignment = new CourseAssignment({
      fileName,
      folderPath,
      courseIds,
      courseNames,
      courseCodes,
      publicUrl,
      fileType,
      fileSize,
      assignedBy,
      assignedAt: new Date(),
      isActive: true
    });

    await assignment.save();

    return NextResponse.json({
      success: true,
      message: 'Course assignment created successfully',
      assignment
    });

  } catch (error) {
    console.error('Course assignment error:', error);
    return NextResponse.json(
      { error: 'Failed to assign course' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const folderPath = searchParams.get('folderPath');
    const courseId = searchParams.get('courseId');

    const query: { isActive: boolean; fileName?: string; folderPath?: string; courseIds?: string } = { isActive: true };

    if (fileName) {
      query.fileName = fileName;
    }

    if (folderPath) {
      query.folderPath = folderPath;
    }

    if (courseId) {
      query.courseIds = courseId;
    }

    const assignments = await CourseAssignment.find(query).sort({ assignedAt: -1 });

    return NextResponse.json({
      success: true,
      assignments
    });

  } catch (error) {
    console.error('Get course assignments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course assignments' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const courseId = searchParams.get('courseId');

    if (!fileName || !courseId) {
      return NextResponse.json(
        { error: 'Missing fileName or courseId' },
        { status: 400 }
      );
    }

    const assignment = await CourseAssignment.findOne({
      fileName,
      courseIds: courseId,
      isActive: true
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Remove specific course from assignment
    const updatedCourseIds = assignment.courseIds.filter((id: string) => id !== courseId);
    const updatedCourseNames = assignment.courseNames.filter((_: string, index: number) => assignment.courseIds[index] !== courseId);
    const updatedCourseCodes = assignment.courseCodes.filter((_: string, index: number) => assignment.courseIds[index] !== courseId);

    if (updatedCourseIds.length === 0) {
      // No courses left, deactivate assignment
      assignment.isActive = false;
    } else {
      // Update with remaining courses
      assignment.courseIds = updatedCourseIds;
      assignment.courseNames = updatedCourseNames;
      assignment.courseCodes = updatedCourseCodes;
    }

    await assignment.save();

    return NextResponse.json({
      success: true,
      message: 'Course assignment removed successfully'
    });

  } catch (error) {
    console.error('Remove course assignment error:', error);
    return NextResponse.json(
      { error: 'Failed to remove course assignment' },
      { status: 500 }
    );
  }
} 