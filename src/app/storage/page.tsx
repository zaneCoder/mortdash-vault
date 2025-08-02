'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  Download, 
  Search, 
  HardDrive, 
  Calendar,
  FileAudio,
  FileVideo,
  FileIcon,
  MessageSquare,
  RefreshCw,
  Filter,
  SortAsc,
  SortDesc,
  Play,
  X,
  ArrowLeft,
  Folder,
  Link,
  ExternalLink,
  MoreHorizontal,
  BookOpen,
  GraduationCap
} from 'lucide-react';

interface GCSFile {
  name: string;
  size: number;
  contentType: string;
  timeCreated: string;
  updated: string;
  bucket: string;
  generation: string;
  metageneration: string;
  etag: string;
  owner: {
    entity: string;
    entityId: string;
  };
  componentCount: number;
  checksum: string;
  md5Hash: string;
  cacheControl: string;
  contentDisposition: string;
  contentEncoding: string;
  contentLanguage: string;
  metadata: {
    [key: string]: string;
  };
  playUrl?: string;
  textContent?: string;
}

interface FileStats {
  totalFiles: number;
  totalSize: number;
  fileTypes: { [key: string]: number };
  recentUploads: number;
}

export default function StoragePage() {
  const [files, setFiles] = useState<GCSFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<GCSFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [folderSearchTerm, setFolderSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [stats, setStats] = useState<FileStats | null>(null);
  const [playingFile, setPlayingFile] = useState<GCSFile | null>(null);
  const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [recentlyCopiedUrls, setRecentlyCopiedUrls] = useState<Set<string>>(new Set());
  const [recentlyOpenedUrls, setRecentlyOpenedUrls] = useState<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Course assignment state
  const [assignedCourses, setAssignedCourses] = useState<{ [fileName: string]: string[] }>({});
  const [courseAssignmentLoading, setCourseAssignmentLoading] = useState<Set<string>>(new Set());

  // Mock course data - this would come from your LMS API
  const mockCourses = [
    { id: 'course-1', name: 'Introduction to Web Development', code: 'WEB101' },
    { id: 'course-2', name: 'Advanced JavaScript Programming', code: 'JS201' },
    { id: 'course-3', name: 'React Fundamentals', code: 'REACT101' },
    { id: 'course-4', name: 'Node.js Backend Development', code: 'NODE201' },
    { id: 'course-5', name: 'Database Design Principles', code: 'DB101' },
    { id: 'course-6', name: 'Cloud Computing Basics', code: 'CLOUD101' },
  ];

  // Fetch course assignments on component mount
  const fetchCourseAssignments = useCallback(async () => {
    try {
      const response = await axios.get('/api/course-assignments');
      
      if (response.data.success && response.data.assignments) {
        const assignmentsMap: { [fileName: string]: string[] } = {};
        response.data.assignments.forEach((assignment: { courseIds: string[]; fileName: string; fileType: string; fileSize: number; publicUrl: string; assignedAt: string; folderPath?: string }) => {
          assignmentsMap[assignment.fileName] = assignment.courseIds;
        });
        setAssignedCourses(assignmentsMap);
      }
    } catch (error) {
      console.error('Failed to fetch course assignments:', error);
    }
  }, []);

  useEffect(() => {
    fetchCourseAssignments();
  }, [fetchCourseAssignments]);

  const router = useRouter();

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/gcs/files');
      
      if (response.data.success) {
        setFiles(response.data.files || []);
        setFilteredFiles(response.data.files || []);
        
        // Calculate stats
        const totalSize = (response.data.files || []).reduce((sum: number, file: GCSFile) => sum + file.size, 0);
        const fileTypes = (response.data.files || []).reduce((acc: { [key: string]: number }, file: GCSFile) => {
          const ext = file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN';
          acc[ext] = (acc[ext] || 0) + 1;
          return acc;
        }, {});
        
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const recentUploads = (response.data.files || []).filter((file: GCSFile) => 
          new Date(file.timeCreated) > oneWeekAgo
        ).length;
        
        setStats({
          totalFiles: response.data.files?.length || 0,
          totalSize,
          fileTypes,
          recentUploads
        });
        
      } else {
        throw new Error(response.data.error || 'Failed to fetch files');
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch files';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Preserve video/audio state when switching between modal and mini-player
  useEffect(() => {
    if (playingFile) {
      const videoElement = videoRef.current;
      const audioElement = audioRef.current;
      
      if (videoElement) {
        // Store current state
        const wasPlaying = !videoElement.paused;
        const currentTime = videoElement.currentTime;
        
        // Restore state after a brief delay to allow DOM update
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = currentTime;
            if (wasPlaying) {
              videoRef.current.play().catch(() => {
                // Ignore play errors (user might have paused)
              });
            }
          }
        }, 100);
      }
      
      if (audioElement) {
        // Store current state
        const wasPlaying = !audioElement.paused;
        const currentTime = audioElement.currentTime;
        
        // Restore state after a brief delay to allow DOM update
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = currentTime;
            if (wasPlaying) {
              audioRef.current.play().catch(() => {
                // Ignore play errors (user might have paused)
              });
            }
          }
        }, 100);
      }
    }
  }, [playingFile]);

  useEffect(() => {
    // Filter and sort files
    let filtered = files;
    
    // Filter by selected folder
    if (selectedFolder !== 'all') {
      filtered = files.filter(file => {
        const pathParts = file.name.split('/');
        return pathParts.length > 2 && pathParts[1] === selectedFolder;
      });
    }
    
    // Filter by search term
    filtered = filtered.filter(file => 
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Filter by folder search term (for meeting names within folders)
    if (folderSearchTerm) {
      filtered = filtered.filter(file => {
        const pathParts = file.name.split('/');
        if (pathParts.length > 2) {
          // Search in the meeting folder name (e.g., "Cassandra Gonzalez's Zoom Meeting")
          const meetingFolder = pathParts[2];
          return meetingFolder.toLowerCase().includes(folderSearchTerm.toLowerCase());
        }
        return true;
      });
    }

    // Filter by selected course
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(file => {
        const fileCourseIds = assignedCourses[file.name] || [];
        return fileCourseIds.includes(selectedCourse);
      });
    }
    
    // Sort files
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'date':
          aValue = new Date(a.timeCreated).getTime();
          bValue = new Date(b.timeCreated).getTime();
          break;
        default:
          aValue = new Date(a.timeCreated).getTime();
          bValue = new Date(b.timeCreated).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredFiles(filtered);
  }, [files, searchTerm, sortBy, sortOrder, selectedFolder, folderSearchTerm, selectedCourse, assignedCourses]);

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

  const getFolderDisplayName = (folderName: string) => {
    // Convert folder name to email format (e.g., "cassandra" -> "cassandra@allureima.com")
    if (folderName === 'Other' || folderName === 'Unknown') {
      return folderName;
    }
    return `${folderName}`;
  };

  const getMeetingName = (fileName: string) => {
    const pathParts = fileName.split('/');
    if (pathParts.length > 2) {
      return pathParts[2]; // Return the meeting folder name
    }
    return fileName.split('/').pop() || fileName; // Fallback to filename
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'mp4':
      case 'avi':
      case 'mov':
        return <FileVideo className="w-5 h-5 text-blue-600" />;
      case 'm4a':
      case 'mp3':
      case 'wav':
        return <FileAudio className="w-5 h-5 text-green-600" />;
      case 'txt':
      case 'pdf':
        return <FileText className="w-5 h-5 text-purple-600" />;
      case 'chat':
        return <MessageSquare className="w-5 h-5 text-indigo-600" />;
      default:
        return <FileIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getFileTypeLabel = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toUpperCase();
    switch (ext) {
      case 'MP4':
        return 'Video';
      case 'M4A':
        return 'Audio';
      case 'TXT':
        return 'Text';
      case 'PDF':
        return 'PDF';
      case 'CHAT':
        return 'Conversation';
      default:
        return ext || 'Unknown';
    }
  };

  const handleDownload = async (fileName: string) => {
    const loadingKey = `download-${fileName}`;
    setLoadingStates(prev => new Set([...prev, loadingKey]));
    
    try {
      const response = await axios.get(`/api/gcs/download?fileName=${encodeURIComponent(fileName)}`, { responseType: 'blob' });
      
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
    } finally {
      setLoadingStates(prev => {
        const newSet = new Set(prev);
        newSet.delete(loadingKey);
        return newSet;
      });
    }
  };

  const handlePlay = async (file: GCSFile) => {
    const loadingKey = `play-${file.name}`;
    setLoadingStates(prev => new Set([...prev, loadingKey]));
    
    try {
      // Get the public URL from the GCS API
      const response = await axios.get(`/api/gcs/public-url?fileName=${encodeURIComponent(file.name)}`);
      
      if (response.data.success) {
        const publicUrl = response.data.publicUrl;
        
        // For text files, also fetch the content for display
        let textContent = '';
        if (file.name.toLowerCase().endsWith('.txt') || 
            file.name.toLowerCase().endsWith('.chat')) {
          const textResponse = await axios.get(publicUrl, { responseType: 'text' });
          textContent = textResponse.data;
        }
        
        // Set the file with the public URL for playback
        setPlayingFile({
          ...file,
          playUrl: publicUrl,
          textContent: textContent
        });
        
      } else {
        throw new Error('Failed to get public URL for playback');
      }
      
    } catch (error) {
      console.error('Play error:', error);
      toast.error('Failed to play file. Please try again.');
    } finally {
      setLoadingStates(prev => {
        const newSet = new Set(prev);
        newSet.delete(loadingKey);
        return newSet;
      });
    }
  };

  const closePlayer = () => {
    // No need to revoke URL since we're using public URLs directly
    setPlayingFile(null);
  };

  const copyPublicUrl = async (fileName: string) => {
    const loadingKey = `copy-${fileName}`;
    setLoadingStates(prev => new Set([...prev, loadingKey]));
    
    try {
      // Get the public URL from the GCS API
      const response = await axios.get(`/api/gcs/public-url?fileName=${encodeURIComponent(fileName)}`);
      
      if (response.data.success) {
        const publicUrl = response.data.publicUrl;
        
        // Copy to clipboard
        await navigator.clipboard.writeText(publicUrl);
        
        // Show visual feedback
        setRecentlyCopiedUrls(prev => new Set([...prev, fileName]));
        
        // Clear the visual feedback after 3 seconds
        setTimeout(() => {
          setRecentlyCopiedUrls(prev => {
            const newSet = new Set(prev);
            newSet.delete(fileName);
            return newSet;
          });
        }, 3000);
        
        toast.success('Public URL copied to clipboard! (Valid for 7 days)');
      } else {
        throw new Error('Failed to get public URL');
      }
      
    } catch (error) {
      console.error('Copy URL error:', error);
      toast.error('Failed to copy public URL. Please try again.');
    } finally {
      setLoadingStates(prev => {
        const newSet = new Set(prev);
        newSet.delete(loadingKey);
        return newSet;
      });
    }
  };

  const openPublicUrl = async (fileName: string) => {
    const loadingKey = `open-${fileName}`;
    setLoadingStates(prev => new Set([...prev, loadingKey]));
    
    try {
      // Get the public URL from the GCS API
      const response = await axios.get(`/api/gcs/public-url?fileName=${encodeURIComponent(fileName)}`);
      
      if (response.data.success) {
        const publicUrl = response.data.publicUrl;
        
        // Open URL in new tab
        window.open(publicUrl, '_blank', 'noopener,noreferrer');
        
        // Show visual feedback
        setRecentlyOpenedUrls(prev => new Set([...prev, fileName]));
        
        // Clear the visual feedback after 3 seconds
        setTimeout(() => {
          setRecentlyOpenedUrls(prev => {
            const newSet = new Set(prev);
            newSet.delete(fileName);
            return newSet;
          });
        }, 3000);
        
        toast.success('Public URL opened in new tab! (Valid for 7 days)');
      } else {
        throw new Error('Failed to get public URL');
      }
      
    } catch (error) {
      console.error('Open URL error:', error);
      toast.error('Failed to open public URL. Please try again.');
    } finally {
      setLoadingStates(prev => {
        const newSet = new Set(prev);
        newSet.delete(loadingKey);
        return newSet;
      });
    }
  };

  const canPlayFile = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['mp4', 'm4a', 'mp3', 'wav', 'txt', 'pdf', 'chat'].includes(ext || '');
  };

  const organizeFilesByFolder = (files: GCSFile[]) => {
    const folders: { [key: string]: GCSFile[] } = {};
    
    files.forEach(file => {
      // Extract folder from file path (e.g., "zoom-recordings/cassandra/Cassandra Gonzalez's Zoom Meeting/")
      const pathParts = file.name.split('/');
      if (pathParts.length > 2) {
        // Get the email folder name (e.g., "cassandra" from "zoom-recordings/cassandra/...")
        const emailFolder = pathParts[1] || 'Unknown';
        if (!folders[emailFolder]) {
          folders[emailFolder] = [];
        }
        folders[emailFolder].push(file);
      } else {
        // Files without proper folder structure
        if (!folders['Other']) {
          folders['Other'] = [];
        }
        folders['Other'].push(file);
      }
    });
    
    return folders;
  };

  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderName)) {
        newSet.delete(folderName);
      } else {
        newSet.add(folderName);
      }
      return newSet;
    });
  };

  const expandAllFolders = () => {
    const folders = Object.keys(organizeFilesByFolder(filteredFiles));
    setExpandedFolders(new Set(folders));
  };

  const collapseAllFolders = () => {
    setExpandedFolders(new Set());
  };

  const toggleAllFolders = () => {
    const folders = Object.keys(organizeFilesByFolder(filteredFiles));
    const allExpanded = folders.every(folder => expandedFolders.has(folder));
    
    if (allExpanded) {
      collapseAllFolders();
    } else {
      expandAllFolders();
    }
  };

  const assignCourseToFile = async (fileName: string, courseId: string) => {
    setCourseAssignmentLoading(prev => new Set([...prev, fileName]));
    
    try {
      // Get the public URL for the file
      const publicUrlResponse = await axios.get(`/api/gcs/public-url?fileName=${encodeURIComponent(fileName)}`);
      if (!publicUrlResponse.data.success) {
        throw new Error('Failed to get public URL');
      }
      const publicUrl = publicUrlResponse.data.publicUrl;

      // Get file info
      const file = files.find(f => f.name === fileName);
      if (!file) {
        throw new Error('File not found');
      }

      // Get course info
      const course = mockCourses.find(c => c.id === courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      // Extract folder path from file name
      const pathParts = fileName.split('/');
      const folderPath = pathParts.length > 2 ? pathParts.slice(0, -1).join('/') : undefined;

      // Call the course assignment API
      const response = await axios.post('/api/course-assignments', {
        fileName,
        folderPath,
        courseIds: [courseId],
        courseNames: [course.name],
        courseCodes: [course.code],
        publicUrl,
        fileType: file.contentType || 'unknown',
        fileSize: file.size,
        assignedBy: 'user' // This would come from authentication
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to assign course');
      }

      const result = response.data;
      
      // Update local state
      setAssignedCourses(prev => ({
        ...prev,
        [fileName]: [...(prev[fileName] || []), courseId]
      }));
      
      toast.success(`Assigned to ${course.code} - ${course.name} successfully!`);
      
    } catch (error) {
      console.error('Course assignment error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to assign course. Please try again.');
    } finally {
      setCourseAssignmentLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileName);
        return newSet;
      });
    }
  };

  const getAssignedCourseName = (fileName: string) => {
    const courseIds = assignedCourses[fileName];
    if (!courseIds || courseIds.length === 0) return null;
    
    const courseNames = courseIds.map(id => {
      const course = mockCourses.find(c => c.id === id);
      return course ? `${course.code} - ${course.name}` : id;
    });
    return courseNames.join(', ');
  };

  const getAllAssignedCourses = () => {
    const allCourseIds = new Set<string>();
    Object.values(assignedCourses).forEach(courseIds => {
      courseIds.forEach(id => allCourseIds.add(id));
    });
    
    return Array.from(allCourseIds).map(courseId => {
      const course = mockCourses.find(c => c.id === courseId);
      return {
        id: courseId,
        name: course ? `${course.code} - ${course.name}` : courseId,
        code: course?.code || courseId
      };
    });
  };

  const assignFolderToCourse = async (folderName: string, courseId: string) => {
    try {
      // Get all files in the folder
      const folderFiles = files.filter(file => {
        const pathParts = file.name.split('/');
        return pathParts.length > 2 && pathParts[1] === folderName;
      });

      if (folderFiles.length === 0) {
        toast.error('No files found in this folder');
        return;
      }

      // Get course info
      const course = mockCourses.find(c => c.id === courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      let successCount = 0;
      let errorCount = 0;

      // Assign each file in the folder
      for (const file of folderFiles) {
        try {
          // Get the public URL for the file
          const publicUrlResponse = await axios.get(`/api/gcs/public-url?fileName=${encodeURIComponent(file.name)}`);
          if (!publicUrlResponse.data.success) {
            errorCount++;
            continue;
          }
          const publicUrl = publicUrlResponse.data.publicUrl;

          // Extract folder path
          const pathParts = file.name.split('/');
          const folderPath = pathParts.length > 2 ? pathParts.slice(0, -1).join('/') : undefined;

          // Call the course assignment API
          const response = await axios.post('/api/course-assignments', {
            fileName: file.name,
            folderPath,
            courseIds: [courseId],
            courseNames: [course.name],
            courseCodes: [course.code],
            publicUrl,
            fileType: file.contentType || 'unknown',
            fileSize: file.size,
            assignedBy: 'user'
          });

          if (response.data.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }

      // Refresh assignments
      await fetchCourseAssignments();

      if (successCount > 0) {
        toast.success(`Successfully assigned ${successCount} files to ${course.code} - ${course.name}`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} files failed to assign`);
      }

    } catch (error) {
      console.error('Folder assignment error:', error);
      toast.error('Failed to assign folder to course. Please try again.');
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
                <span className="text-muted-foreground">Loading storage files...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full bg-background">
        <div className="p-8 max-w-7xl mx-auto">
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 text-destructive">⚠️</div>
                <span className="text-destructive font-medium text-lg">Error</span>
              </div>
              <p className="text-destructive mb-6">{error}</p>
              <Button onClick={fetchFiles} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
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
                    <HardDrive className="w-6 h-6 text-primary" />
                    Google Cloud Storage
                  </h1>
                  <p className="text-muted-foreground mt-1">View and play your uploaded files</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={fetchFiles} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Total Files</div>
                    <div className="text-lg font-semibold">{stats.totalFiles}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="text-sm font-medium">Total Size</div>
                    <div className="text-lg font-semibold">{formatFileSize(stats.totalSize)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="text-sm font-medium">Recent Uploads</div>
                    <div className="text-lg font-semibold">{stats.recentUploads}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Filter className="w-5 h-5 text-orange-600" />
                  <div>
                    <div className="text-sm font-medium">File Types</div>
                    <div className="text-lg font-semibold">{Object.keys(stats.fileTypes).length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              {/* Folder Selection and Search */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search files..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Folder Selection */}
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">All Folders</option>
                    {Object.keys(organizeFilesByFolder(files)).map(folder => (
                      <option key={folder} value={folder}>
                        {getFolderDisplayName(folder)} ({organizeFilesByFolder(files)[folder].length} files)
                      </option>
                    ))}
                  </select>

                  {/* Course Selection */}
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">All Courses</option>
                    {getAllAssignedCourses().map(course => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'size' | 'date')}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                    <option value="size">Size</option>
                  </select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              
              {/* Folder-specific search */}
              {selectedFolder !== 'all' && (
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder={`Search meetings in ${getFolderDisplayName(selectedFolder)}...`}
                      value={folderSearchTerm}
                      onChange={(e) => setFolderSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFolderSearchTerm('')}
                    disabled={!folderSearchTerm}
                  >
                    Clear
                  </Button>
                </div>
              )}

              {/* Course filter info */}
              {selectedCourse !== 'all' && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap className="w-4 h-4" />
                    <span>Filtering by course: {getAllAssignedCourses().find(c => c.id === selectedCourse)?.name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCourse('all')}
                  >
                    Clear Course Filter
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Files List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Files ({filteredFiles.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllFolders}
              >
                {Object.keys(organizeFilesByFolder(filteredFiles)).every(folder => expandedFolders.has(folder)) ? (
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
          </CardHeader>
          <CardContent>
            {filteredFiles.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No files match your search.' : 'No files found in storage.'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(organizeFilesByFolder(filteredFiles)).map(([folderName, folderFiles]) => (
                  <div key={folderName} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFolder(folderName)}
                        className="p-1 h-auto"
                      >
                        {expandedFolders.has(folderName) ? (
                          <span className="text-blue-600 text-xs">▼</span>
                        ) : (
                          <span className="text-blue-600 text-xs">▶</span>
                        )}
                      </Button>
                      <Folder className="w-4 h-4 text-blue-600" />
                      <h3 className="font-semibold text-sm text-gray-700">{getFolderDisplayName(folderName)}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {folderFiles.length} files
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <GraduationCap className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80 z-[100]">
                          <div className="sticky top-0 bg-popover border-b border-border px-2 py-1.5 z-10">
                            <DropdownMenuLabel className="text-sm font-semibold">Assign Folder to Course</DropdownMenuLabel>
                          </div>
                          <div className="overflow-y-auto overflow-x-hidden">
                            <DropdownMenuSeparator />
                            {mockCourses.map((course) => (
                              <DropdownMenuItem
                                key={course.id}
                                onClick={() => assignFolderToCourse(folderName, course.id)}
                                className="truncate"
                              >
                                <GraduationCap className="w-4 h-4 mr-2 flex-shrink-0" />
                                <span className="truncate cursor-help" title={`${course.code} - ${course.name}`}>
                                  {course.code} - {course.name}
                                </span>
                              </DropdownMenuItem>
                            ))}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {expandedFolders.has(folderName) && (
                      <div className="space-y-2">
                        {folderFiles.map((file) => (
                          <Card key={file.name} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="flex-shrink-0">
                                    {getFileIcon(file.name)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">
                                      {getMeetingName(file.name)}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {formatDate(file.timeCreated)} • {formatFileSize(file.size)}
                                    </div>
                                    <div className="mt-1 flex items-center gap-2">
                                      <Badge variant="secondary" className="text-xs">
                                        {getFileTypeLabel(file.name)}
                                      </Badge>
                                      {getAssignedCourseName(file.name) && (
                                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                          <BookOpen className="w-3 h-3 mr-1" />
                                          Assigned
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* Actions Dropdown */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 z-[100]">
                                      <div className="sticky top-0 bg-popover border-b border-border px-2 py-1.5 z-10">
                                        <DropdownMenuLabel className="text-sm font-semibold">Actions</DropdownMenuLabel>
                                      </div>
                                      <div className="overflow-y-auto overflow-x-hidden">
                                        <DropdownMenuSeparator />
                                        
                                        {canPlayFile(file.name) && (
                                          <DropdownMenuItem
                                            onClick={() => handlePlay(file)}
                                            disabled={loadingStates.has(`play-${file.name}`)}
                                          >
                                            <Play className="w-4 h-4 mr-2" />
                                            {loadingStates.has(`play-${file.name}`) ? 'Playing...' : 'Play'}
                                          </DropdownMenuItem>
                                        )}
                                        
                                        <DropdownMenuItem
                                          onClick={() => copyPublicUrl(file.name)}
                                          disabled={loadingStates.has(`copy-${file.name}`)}
                                        >
                                          <Link className="w-4 h-4 mr-2" />
                                          {loadingStates.has(`copy-${file.name}`) ? 'Copying...' : 'Copy URL'}
                                        </DropdownMenuItem>
                                        
                                        <DropdownMenuItem
                                          onClick={() => openPublicUrl(file.name)}
                                          disabled={loadingStates.has(`open-${file.name}`)}
                                        >
                                          <ExternalLink className="w-4 h-4 mr-2" />
                                          {loadingStates.has(`open-${file.name}`) ? 'Opening...' : 'Open URL'}
                                        </DropdownMenuItem>
                                        
                                        <DropdownMenuItem
                                          onClick={() => handleDownload(file.name)}
                                          disabled={loadingStates.has(`download-${file.name}`)}
                                        >
                                          <Download className="w-4 h-4 mr-2" />
                                          {loadingStates.has(`download-${file.name}`) ? 'Downloading...' : 'Download'}
                                        </DropdownMenuItem>
                                      </div>
                                    </DropdownMenuContent>
                                  </DropdownMenu>

                                  {/* Course Assignment Dropdown */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <GraduationCap className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-80 z-[100]">
                                      <div className="sticky top-0 bg-popover border-b border-border px-2 py-1.5 z-10">
                                        <DropdownMenuLabel className="text-sm font-semibold">Course Assignment</DropdownMenuLabel>
                                      </div>
                                      <div className="overflow-y-auto overflow-x-hidden">
                                        <DropdownMenuSeparator />
                                        
                                        {getAssignedCourseName(file.name) && (
                                          <DropdownMenuItem disabled className="text-green-600">
                                            <BookOpen className="w-4 h-4 mr-2 flex-shrink-0" />
                                            <span className="truncate cursor-help" title={`Assigned: ${getAssignedCourseName(file.name)}`}>
                                              Assigned: {getAssignedCourseName(file.name)}
                                            </span>
                                          </DropdownMenuItem>
                                        )}
                                        
                                        {mockCourses.map((course) => (
                                          <DropdownMenuItem
                                            key={course.id}
                                            onClick={() => assignCourseToFile(file.name, course.id)}
                                            disabled={courseAssignmentLoading.has(file.name)}
                                            className={`truncate ${assignedCourses[file.name]?.includes(course.id) ? 'bg-green-50 text-green-700' : ''}`}
                                          >
                                            <GraduationCap className="w-4 h-4 mr-2 flex-shrink-0" />
                                            <span className="truncate cursor-help" title={`${course.code} - ${course.name}`}>
                                              {course.code} - {course.name}
                                            </span>
                                            {courseAssignmentLoading.has(file.name) && (
                                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary ml-auto flex-shrink-0"></div>
                                            )}
                                          </DropdownMenuItem>
                                        ))}
                                      </div>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* File Player Modal */}
      {playingFile && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-500 ease-in-out">
            <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border-0 transition-all duration-500 ease-in-out transform scale-100">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {getFileIcon(playingFile.name)}
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {getMeetingName(playingFile.name)}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDate(playingFile.timeCreated)} • {formatFileSize(playingFile.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={closePlayer}
                      variant="outline"
                      size="sm"
                      className="hover:bg-gray-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 bg-white">
                {playingFile.name.toLowerCase().endsWith('.mp4') ? (
                  <div className="space-y-4">
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        controls
                        className="w-full h-auto max-h-[60vh]"
                        src={playingFile.playUrl}
                        autoPlay
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    <div className="flex justify-center gap-3">
                      <Button onClick={() => copyPublicUrl(playingFile.name)} variant="outline">
                        <Link className="w-4 h-4 mr-2" />
                        Copy URL
                      </Button>
                      <Button onClick={() => openPublicUrl(playingFile.name)} variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open URL
                      </Button>
                      <Button onClick={() => handleDownload(playingFile.name)}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : playingFile.name.toLowerCase().endsWith('.m4a') || 
                     playingFile.name.toLowerCase().endsWith('.mp3') || 
                     playingFile.name.toLowerCase().endsWith('.wav') ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <audio
                        ref={audioRef}
                        controls
                        className="w-full"
                        src={playingFile.playUrl}
                        autoPlay
                      >
                        Your browser does not support the audio tag.
                      </audio>
                    </div>
                    <div className="flex justify-center gap-3">
                      <Button onClick={() => copyPublicUrl(playingFile.name)} variant="outline">
                        <Link className="w-4 h-4 mr-2" />
                        Copy URL
                      </Button>
                      <Button onClick={() => openPublicUrl(playingFile.name)} variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open URL
                      </Button>
                      <Button onClick={() => handleDownload(playingFile.name)}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : playingFile.name.toLowerCase().endsWith('.txt') || 
                     playingFile.name.toLowerCase().endsWith('.chat') ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg max-h-[60vh] overflow-y-auto border">
                      {playingFile.textContent ? (
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                          {playingFile.textContent}
                        </pre>
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                          <span className="text-sm text-gray-600">Loading conversation...</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-center gap-3">
                      <Button onClick={() => copyPublicUrl(playingFile.name)} variant="outline">
                        <Link className="w-4 h-4 mr-2" />
                        Copy URL
                      </Button>
                      <Button onClick={() => openPublicUrl(playingFile.name)} variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open URL
                      </Button>
                      <Button onClick={() => handleDownload(playingFile.name)}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ) : playingFile.name.toLowerCase().endsWith('.pdf') ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-6 rounded-lg text-center">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">
                        PDF files need to be downloaded to view. Click the download button below.
                      </p>
                    </div>
                    <div className="flex justify-center gap-3">
                      <Button onClick={() => copyPublicUrl(playingFile.name)} variant="outline">
                        <Link className="w-4 h-4 mr-2" />
                        Copy URL
                      </Button>
                      <Button onClick={() => openPublicUrl(playingFile.name)} variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open URL
                      </Button>
                      <Button onClick={() => handleDownload(playingFile.name)}>
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-6 rounded-lg text-center">
                      <FileIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">Preview not available for this file type.</p>
                    </div>
                    <div className="flex justify-center gap-3">
                      <Button onClick={() => copyPublicUrl(playingFile.name)} variant="outline">
                        <Link className="w-4 h-4 mr-2" />
                        Copy URL
                      </Button>
                      <Button onClick={() => openPublicUrl(playingFile.name)} variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open URL
                      </Button>
                      <Button onClick={() => handleDownload(playingFile.name)}>
                        <Download className="w-4 h-4 mr-2" />
                        Download File
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
} 