'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  GraduationCap, 
  Play, 
  Download, 
  Link, 
  ArrowLeft,
  Search,
  FileVideo,
  FileAudio,
  FileText,
  Calendar,
  Users,
  Video,
  RefreshCw
} from 'lucide-react';

// Mock course data - this would come from your LMS API
const mockCourses = [
  { id: 'course-1', name: 'Introduction to Web Development', code: 'WEB101' },
  { id: 'course-2', name: 'Advanced JavaScript Programming', code: 'JS201' },
  { id: 'course-3', name: 'React Fundamentals', code: 'REACT101' },
  { id: 'course-4', name: 'Node.js Backend Development', code: 'NODE201' },
  { id: 'course-5', name: 'Database Design Principles', code: 'DB101' },
  { id: 'course-6', name: 'Cloud Computing Basics', code: 'CLOUD101' },
];

interface Course {
  id: string;
  code: string;
  name: string;
  assignedVideos: AssignedVideo[];
}

interface AssignedVideo {
  fileName: string;
  fileType: string;
  fileSize: number;
  publicUrl: string;
  assignedAt: string;
  folderPath?: string;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const router = useRouter();

  const fetchCourseAssignments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/course-assignments');
      
      if (response.data.success && response.data.assignments) {
        // Group assignments by course
        const courseMap: { [courseId: string]: AssignedVideo[] } = {};
        
        response.data.assignments.forEach((assignment: { courseIds: string[]; fileName: string; fileType: string; fileSize: number; publicUrl: string; assignedAt: string; folderPath?: string }) => {
          assignment.courseIds.forEach((courseId: string) => {
            if (!courseMap[courseId]) {
              courseMap[courseId] = [];
            }
            
            courseMap[courseId].push({
              fileName: assignment.fileName,
              fileType: assignment.fileType,
              fileSize: assignment.fileSize,
              publicUrl: assignment.publicUrl,
              assignedAt: assignment.assignedAt,
              folderPath: assignment.folderPath
            });
          });
        });

        // Create course objects with assigned videos
        const coursesWithVideos = mockCourses.map(course => ({
          ...course,
          assignedVideos: courseMap[course.id] || []
        }));

        setCourses(coursesWithVideos);
        setFilteredCourses(coursesWithVideos);
      }
    } catch (error) {
      console.error('Failed to fetch course assignments:', error);
      toast.error('Failed to load course assignments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourseAssignments();
  }, [fetchCourseAssignments]);

  useEffect(() => {
    let filtered = courses;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(course => 
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by selected course
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(course => course.id === selectedCourse);
    }
    
    setFilteredCourses(filtered);
  }, [courses, searchTerm, selectedCourse]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('video')) return <FileVideo className="w-5 h-5 text-blue-600" />;
    if (fileType.includes('audio')) return <FileAudio className="w-5 h-5 text-green-600" />;
    return <FileText className="w-5 h-5 text-purple-600" />;
  };

  const handlePlay = async (publicUrl: string) => {
    try {
      window.open(publicUrl, '_blank', 'noopener,noreferrer');
      toast.success('Opening video in new tab');
    } catch (error) {
      console.error('Play error:', error);
      toast.error('Failed to play video');
    }
  };

  const handleDownload = async (fileName: string) => {
    try {
      const response = await axios.get(`/api/gcs/download?fileName=${encodeURIComponent(fileName)}`, { 
        responseType: 'blob' 
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Downloaded ${fileName} successfully!`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed. Please try again.');
    }
  };

  const copyPublicUrl = async (fileName: string) => {
    try {
      const response = await axios.get(`/api/gcs/public-url?fileName=${encodeURIComponent(fileName)}`);
      
      if (response.data.success) {
        const publicUrl = response.data.publicUrl;
        await navigator.clipboard.writeText(publicUrl);
        toast.success('Public URL copied to clipboard! (Valid for 7 days)');
      } else {
        throw new Error('Failed to get public URL');
      }
    } catch (error) {
      console.error('Copy URL error:', error);
      toast.error('Failed to copy public URL. Please try again.');
    }
  };

  const toggleCourse = (courseId: string) => {
    setExpandedCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  const expandAllCourses = () => {
    const courseIds = filteredCourses.map(course => course.id);
    setExpandedCourses(new Set(courseIds));
  };

  const collapseAllCourses = () => {
    setExpandedCourses(new Set());
  };

  const toggleAllCourses = () => {
    const courseIds = filteredCourses.map(course => course.id);
    const allExpanded = courseIds.every(courseId => expandedCourses.has(courseId));
    
    if (allExpanded) {
      collapseAllCourses();
    } else {
      expandAllCourses();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full bg-background">
        <div className="p-8 max-w-7xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="text-muted-foreground">Loading courses...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button onClick={() => router.back()} variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <GraduationCap className="w-6 h-6 text-primary" />
                    Course Management
                  </h1>
                  <p className="text-muted-foreground mt-1">View all courses and their assigned videos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={fetchCourseAssignments} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-sm font-medium">Total Courses</div>
                  <div className="text-lg font-semibold">{courses.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-sm font-medium">Total Videos</div>
                  <div className="text-lg font-semibold">
                    {courses.reduce((sum, course) => sum + course.assignedVideos.length, 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium">Active Courses</div>
                  <div className="text-lg font-semibold">
                    {courses.filter(course => course.assignedVideos.length > 0).length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="text-sm font-medium">Recent Assignments</div>
                  <div className="text-lg font-semibold">
                    {courses.reduce((sum, course) => {
                      const recentAssignments = course.assignedVideos.filter(video => {
                        const assignedDate = new Date(video.assignedAt);
                        const oneWeekAgo = new Date();
                        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                        return assignedDate > oneWeekAgo;
                      });
                      return sum + recentAssignments.length;
                    }, 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search courses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Courses</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Courses List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Courses ({filteredCourses.length})</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllCourses}
            >
              {filteredCourses.every(course => expandedCourses.has(course.id)) ? (
                <>
                  Collapse All
                </>
              ) : (
                <>
                  Expand All
                </>
              )}
            </Button>
          </div>
          
          {filteredCourses.map((course) => (
            <Card key={course.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCourse(course.id)}
                      className="p-1 h-auto"
                    >
                      {expandedCourses.has(course.id) ? (
                        <span className="text-blue-600 text-xs">▼</span>
                      ) : (
                        <span className="text-blue-600 text-xs">▶</span>
                      )}
                    </Button>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <GraduationCap className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{course.code} - {course.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {course.assignedVideos.length} assigned videos
                      </p>
                    </div>
                  </div>
                  <Badge variant={course.assignedVideos.length > 0 ? "default" : "secondary"}>
                    {course.assignedVideos.length > 0 ? 'Active' : 'No Videos'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {course.assignedVideos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No videos assigned to this course yet.</p>
                    <p className="text-sm mt-1">Assign videos from the storage page to see them here.</p>
                  </div>
                ) : (
                  expandedCourses.has(course.id) && (
                    <div className="space-y-3">
                      {course.assignedVideos.map((video, index) => (
                        <Card key={index} className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="flex-shrink-0">
                                  {getFileIcon(video.fileType)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">
                                    {video.fileName.split('/').pop()}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {formatDate(video.assignedAt)} • {formatFileSize(video.fileSize)}
                                  </div>
                                  {video.folderPath && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Folder: {video.folderPath.split('/')[1]}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePlay(video.publicUrl)}
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  Play
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyPublicUrl(video.fileName)}
                                >
                                  <Link className="w-4 h-4 mr-2" />
                                  Copy URL
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownload(video.fileName)}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No courses match your search.' : 'No courses found.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 