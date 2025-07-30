'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import moment from 'moment-timezone';
import { toast } from 'sonner';
import { UploadProgressModal } from '@/components/upload-progress-modal';
import { UploadProgressMini } from '@/components/upload-progress-mini';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Play, 
  Clock, 
  HardDrive, 
  AlertCircle, 
  CheckCircle,
  FileAudio,
  FileVideo,
  MessageSquare,
  Upload,
  X,
  FileIcon
} from 'lucide-react';

interface RecordingFile {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_extension: string;
  file_size: number;
  play_url: string;
  download_url: string;
  status: string;
  recording_type: string;
}

interface MeetingRecordings {
  account_id: string;
  duration: number;
  host_id: string;
  id: number;
  recording_count: number;
  start_time: string;
  topic: string;
  total_size: number;
  type: string;
  uuid: string;
  recording_play_passcode: string;
  auto_delete: boolean;
  auto_delete_date: string;
  recording_files: RecordingFile[];
  download_access_token?: string;
  password?: string;
  participant_audio_files?: RecordingFile[];
}

interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface UploadedFileRecord {
  fileId: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
}

export default function FilesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = params.meetingId as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<MeetingRecordings | null>(null);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showMiniProgress, setShowMiniProgress] = useState(false);
  const [playingFile, setPlayingFile] = useState<RecordingFile | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Set<string>>(new Set());
  const [isCheckingUploads, setIsCheckingUploads] = useState(false);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});

  const checkUploadedFiles = useCallback(async () => {
    if (!meetingId) return;
    
    setIsCheckingUploads(true);
    try {
      const response = await fetch(`/api/uploaded-files?meetingId=${meetingId}`);
      const result = await response.json();
      
      if (result.success && result.uploadedFiles) {
        const uploadedFileIds = new Set<string>();
        result.uploadedFiles.forEach((file: UploadedFileRecord) => {
          uploadedFileIds.add(file.fileId);
        });
        setUploadedFiles(uploadedFileIds);
        console.log('📋 Found uploaded files:', uploadedFileIds);
      }
    } catch (error) {
      console.error('Failed to check uploaded files:', error);
    } finally {
      setIsCheckingUploads(false);
    }
  }, [meetingId]);

  const fetchRecordings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/zoom/meeting/${meetingId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch meeting recordings');
      }

      setRecordings(result.recordings);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch meeting recordings';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    if (meetingId) {
      fetchRecordings();
      checkUploadedFiles();
    }
  }, [meetingId, fetchRecordings, checkUploadedFiles]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDateTime = (dateString: string) => {
    const date = moment.utc(dateString);
    // Keep in UTC if no timezone specified to avoid date shifting
    // Only format the time part to local time for display
    return {
      date: date.format('MMM DD, YYYY'),
      time: date.local().format('h:mm A'),
      timezone: 'UTC'
    };
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'MP4':
        return <FileVideo className="w-5 h-5 text-blue-600" />;
      case 'M4A':
        return <FileAudio className="w-5 h-5 text-green-600" />;
      case 'CHAT':
        return <MessageSquare className="w-5 h-5 text-purple-600" />;
      default:
        return <FileIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRecordingTypeLabel = (recordingType: string) => {
    switch (recordingType) {
      case 'shared_screen_with_speaker_view':
        return 'Screen + Speaker';
      case 'shared_screen_with_gallery_view':
        return 'Screen + Gallery';
      case 'audio_only':
        return 'Audio Only';
      case 'chat_file':
        return 'Chat';
      default:
        return recordingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const downloadFile = async (file: RecordingFile) => {
    try {
      console.log('📥 Starting download for file:', file.id);
      console.log('🔗 Download URL:', file.download_url);
      console.log('📋 Meeting ID:', recordings?.id);
      console.log('📋 Meeting Topic:', recordings?.topic);
      console.log('📋 File Type:', file.file_type);
      console.log('📋 File Extension:', file.file_extension);
      
      const requestBody = {
        fileUrl: file.download_url,
        meetingId: recordings?.id,
        fileName: `${recordings?.topic || 'Meeting'}_${file.file_type}_${file.id}.${file.file_extension}`
      };
      
      console.log('📤 Sending download request with body:', requestBody);
      
      // Use XMLHttpRequest for progress tracking
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.open('POST', '/api/zoom/download', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        // Track download progress
        xhr.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setDownloadProgress(prev => ({ ...prev, [file.id]: progress }));
            console.log(`📥 Download progress for ${file.id}: ${progress}%`);
          }
        };
        
        xhr.onload = async () => {
          if (xhr.status === 200) {
            try {
              // Create blob from response
              const blob = new Blob([xhr.response]);
              console.log('📦 Blob size:', blob.size, 'bytes');
              
              // Trigger download
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${recordings?.topic || 'Meeting'}_${file.file_type}_${file.id}.${file.file_extension}`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              
              console.log('✅ Download completed for file:', file.id);
              toast.success(`Downloaded ${file.file_type} file successfully!`);
              setDownloadProgress(prev => ({ ...prev, [file.id]: 100 }));
              
              resolve();
            } catch (error) {
              console.error('❌ Download processing failed:', error);
              toast.error('Download processing failed. Please try again.');
              reject(error);
            }
          } else {
            console.error('❌ Download failed with status:', xhr.status);
            toast.error('Download failed. Please try again.');
            reject(new Error(`Download failed with status: ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => {
          console.error('❌ Download network error');
          toast.error('Download failed. Please try again.');
          reject(new Error('Network error during download'));
        };
        
        xhr.responseType = 'blob';
        xhr.send(JSON.stringify(requestBody));
      });
      
    } catch (error) {
      console.error('❌ Download failed for file:', file.id, error);
      toast.error('Download failed. Please try again.');
    } finally {
      // Remove file from downloading set
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.id);
        return newSet;
      });
      // Clear progress after a delay
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.id];
          return newProgress;
        });
      }, 2000);
    }
  };

  const updateUploadProgress = (fileId: string, progress: number, status: 'pending' | 'uploading' | 'completed' | 'error', error?: string) => {
    setUploadFiles(prev => 
      prev.map(file => 
        file.id === fileId 
          ? { ...file, progress: Math.round(progress), status, error }
          : file
      )
    );
  };

  const uploadFile = async (file: RecordingFile) => {
    // Prevent duplicate uploads
    if (uploadingFiles.has(file.id)) {
      console.log('⚠️ Upload already in progress for file:', file.id);
      return;
    }

    const uploadFile: UploadFile = {
      id: file.id,
      name: `${file.file_type}_${file.id}.${file.file_extension}`,
      size: file.file_size,
      type: file.file_type,
      progress: 0,
      status: 'pending'
    };

    setUploadFiles(prev => [...prev, uploadFile]);
    setIsUploadModalOpen(true);
    setShowMiniProgress(false);

    try {
      console.log('🚀 Starting GCS upload for file:', file.id);
      
      // Add file to uploading set
      setUploadingFiles(prev => new Set([...prev, file.id]));
      
      // Start progress simulation based on file size with smoother animation
      const fileSizeMB = file.file_size / (1024 * 1024);
      const estimatedTimeMs = fileSizeMB * 800; // Slightly faster for better UX
      const updateInterval = Math.max(50, estimatedTimeMs / 100); // More frequent updates
      
      updateUploadProgress(file.id, 0, 'uploading');
      
      const progressTimer = setInterval(() => {
        setUploadFiles(prev => 
          prev.map(f => 
            f.id === file.id && f.progress < 85
              ? { ...f, progress: Math.round(f.progress + (Math.random() * 3 + 1)) } // Random increments for more natural feel
              : f
          )
        );
      }, updateInterval);
      
      const response = await fetch('/api/gcs/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl: file.download_url,
          fileName: `${file.file_type}_${file.id}.${file.file_extension}`,
          fileType: file.file_type,
          meetingId: recordings?.id,
          fileId: file.id
        }),
      });

      clearInterval(progressTimer);
      
      console.log('📡 GCS upload response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ GCS upload error response:', errorData);
        updateUploadProgress(file.id, 0, 'error', errorData.error || 'Upload failed');
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      console.log('✅ GCS upload successful:', result);
      
      // Smooth completion animation
      for (let i = 85; i <= 100; i += 2) {
        await new Promise(resolve => setTimeout(resolve, 20));
        updateUploadProgress(file.id, i, 'uploading');
      }
      
      updateUploadProgress(file.id, 100, 'completed');
      toast.success(`Uploaded ${file.file_type} file to Google Cloud Storage!`);
      
      // Refresh uploaded files list
      await checkUploadedFiles();
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      console.error('❌ GCS upload failed for file:', file.id, error);
      updateUploadProgress(file.id, 0, 'error', errorMessage);
    } finally {
      // Remove file from uploading set
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.id);
        return newSet;
      });
    }
  };

  const uploadAllFiles = async () => {
    if (!recordings) return;

    const allFiles = recordings.recording_files;
    const filesToUpload = allFiles.filter(file => !uploadedFiles.has(file.id) && !uploadingFiles.has(file.id));
    
    if (filesToUpload.length === 0) {
      toast.success('All files have already been uploaded or are currently uploading!');
      return;
    }
    
    console.log('🚀 Starting simultaneous download/upload for', filesToUpload.length, 'files');

    // Initialize upload files
    const uploadFilesList: UploadFile[] = filesToUpload.map(file => ({
      id: file.id,
      name: `${file.file_type}_${file.id}.${file.file_extension}`,
      size: file.file_size,
      type: file.file_type,
      progress: 0,
      status: 'pending'
    }));

    setUploadFiles(uploadFilesList);
    setIsUploadModalOpen(true);
    setShowMiniProgress(false);

    try {
      // Add all files to uploading set immediately
      setUploadingFiles(prev => new Set([...prev, ...filesToUpload.map(f => f.id)]));
      
      // Start all uploads simultaneously
      const uploadPromises = filesToUpload.map(async (file, index) => {
        console.log(`📤 Starting simultaneous upload ${index + 1}/${filesToUpload.length}:`, file.file_type);
        
        updateUploadProgress(file.id, 0, 'uploading');
        
        // Start progress simulation for this file
        const fileSizeMB = file.file_size / (1024 * 1024);
        const estimatedTimeMs = fileSizeMB * 800;
        const updateInterval = Math.max(50, estimatedTimeMs / 100);
        
        const progressTimer = setInterval(() => {
          setUploadFiles(prev => 
            prev.map(f => 
              f.id === file.id && f.progress < 85
                ? { ...f, progress: Math.round(f.progress + (Math.random() * 3 + 1)) }
                : f
            )
          );
        }, updateInterval);

        try {
          const response = await fetch('/api/gcs/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileUrl: file.download_url,
              fileName: `${file.file_type}_${file.id}.${file.file_extension}`,
              fileType: file.file_type,
              meetingId: recordings.id,
              fileId: file.id
            }),
          });

          clearInterval(progressTimer);

          if (!response.ok) {
            const error = await response.json();
            updateUploadProgress(file.id, 0, 'error', error.error || `Upload failed for ${file.file_type} file`);
            throw new Error(error.error || `Upload failed for ${file.file_type} file`);
          }

          const result = await response.json();
          console.log(`✅ Uploaded ${file.file_type} file:`, result);
          
          // Smooth completion animation
          for (let i = 85; i <= 100; i += 2) {
            await new Promise(resolve => setTimeout(resolve, 20));
            updateUploadProgress(file.id, i, 'uploading');
          }
          
          updateUploadProgress(file.id, 100, 'completed');
          
          return { success: true, file };
        } catch (error) {
          clearInterval(progressTimer);
          console.error(`❌ Upload failed for ${file.file_type} file:`, error);
          updateUploadProgress(file.id, 0, 'error', error instanceof Error ? error.message : 'Upload failed');
          return { success: false, file, error };
        }
      });

      // Wait for all uploads to complete
      const results = await Promise.allSettled(uploadPromises);
      
      // Process results
      const successfulUploads = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;
      
      const failedUploads = results.filter(result => 
        result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)
      ).length;

      // Remove all files from uploading set
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        filesToUpload.forEach(file => newSet.delete(file.id));
        return newSet;
      });

      if (successfulUploads > 0) {
        toast.success(`Successfully uploaded ${successfulUploads} files to Google Cloud Storage!`);
      }
      
      if (failedUploads > 0) {
        toast.error(`${failedUploads} files failed to upload. Please try again.`);
      }
      
      // Refresh uploaded files list
      await checkUploadedFiles();
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      console.error('❌ Bulk upload failed:', error);
      toast.error(`Upload failed: ${errorMessage}`);
      
      // Remove all files from uploading set on error
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        filesToUpload.forEach(file => newSet.delete(file.id));
        return newSet;
      });
    }
  };

  const closePlayer = () => {
    setPlayingFile(null);
  };

  const handleBackNavigation = () => {
    setIsNavigatingBack(true);
    // Preserve search parameters when going back
    const currentParams = new URLSearchParams(searchParams.toString());
    const backUrl = currentParams.toString() ? `/?${currentParams.toString()}` : '/';
    router.push(backUrl);
  };

  const handleUploadComplete = () => {
    setUploadFiles([]);
    setShowMiniProgress(false);
    toast.success('Upload process completed!');
  };

  const handleModalClose = () => {
    setIsUploadModalOpen(false);
    // Show mini progress if there are still uploading files
    const hasUploadingFiles = uploadFiles.some(f => f.status === 'uploading' || f.status === 'pending');
    if (hasUploadingFiles) {
      setShowMiniProgress(true);
    }
  };

  const handleOpenModal = () => {
    setIsUploadModalOpen(true);
    setShowMiniProgress(false);
  };

  const handleMiniProgressClose = () => {
    setShowMiniProgress(false);
    setUploadFiles([]);
  };

  const handleDownloadClick = (file: RecordingFile, event: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent duplicate downloads
    if (downloadingFiles.has(file.id)) {
      console.log('⚠️ Download already in progress for file:', file.id);
      toast.error('Download already in progress for this file');
      return;
    }

    // Immediately set loading state to prevent spam clicking
    setDownloadingFiles(prev => new Set([...prev, file.id]));
    setDownloadProgress(prev => ({ ...prev, [file.id]: 0 }));

    // Force immediate visual feedback
    const button = event.currentTarget;
    if (button) {
      button.disabled = true;
      button.style.backgroundColor = '#eff6ff';
      button.style.borderColor = '#bfdbfe';
      button.style.color = '#1d4ed8';
      button.style.opacity = '0.75';
      button.style.cursor = 'not-allowed';
    }

    // Start the download process
    downloadFile(file);
  };

  if (isLoading) {
    return (
      <div className="min-h-full bg-background">
        <div className="p-8 max-w-7xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="text-muted-foreground">Loading meeting recordings...</span>
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
                <AlertCircle className="w-6 h-6 text-destructive" />
                <span className="text-destructive font-medium text-lg">Error</span>
              </div>
              <p className="text-destructive mb-6">{error}</p>
              <Button
                onClick={handleBackNavigation}
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!recordings) {
    return (
      <div className="min-h-full bg-background">
        <div className="p-8 max-w-7xl mx-auto">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No recordings found.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const dateTime = formatDateTime(recordings.start_time);

  return (
    <div className="min-h-full bg-background">
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleBackNavigation}
                  variant="outline"
                  size="sm"
                  disabled={isNavigatingBack}
                >
                  {isNavigatingBack ? (
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <ArrowLeft className="w-4 h-4 mr-2" />
                  )}
                  {isNavigatingBack ? 'Going Back...' : 'Back to Dashboard'}
                </Button>
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="w-6 h-6 text-primary" />
                    Meeting Files
                  </h1>
                  <p className="text-muted-foreground mt-1">{recordings.topic}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Meeting ID: {recordings.id}</div>
                  <div className="text-sm text-muted-foreground">{dateTime.date} at {dateTime.time}</div>
                </div>
                <Button
                  onClick={uploadAllFiles}
                  className={uploadedFiles.size === recordings.recording_files.length ? "bg-green-600 hover:bg-green-700" : "bg-green-600 hover:bg-green-700"}
                  disabled={uploadedFiles.size === recordings.recording_files.length || isCheckingUploads || uploadingFiles.size > 0}
                >
                  {uploadedFiles.size === recordings.recording_files.length ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : uploadingFiles.size > 0 ? (
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {uploadedFiles.size === recordings.recording_files.length ? 'All Files Uploaded' : uploadingFiles.size > 0 ? 'Uploading...' : 'Upload All Files'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meeting Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-sm font-medium">Duration</div>
                  <div className="text-lg font-semibold">{formatDuration(recordings.duration)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium">Files</div>
                  <div className="text-lg font-semibold">{recordings.recording_count} files</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="text-sm font-medium">Total Size</div>
                  <div className="text-lg font-semibold">{formatFileSize(recordings.total_size)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium">Status</div>
                  <div className="text-lg font-semibold">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recording Files */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recording Files ({recordings.recording_files.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recordings.recording_files.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recording files found for this meeting.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recordings.recording_files.map((file) => {
                  const fileDateTime = formatDateTime(file.recording_start);
                  
                  return (
                    <Card key={file.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              {getFileIcon(file.file_type)}
                            </div>
                            <div>
                              <div className="text-lg font-semibold">
                                {file.file_type} - {getRecordingTypeLabel(file.recording_type)}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {fileDateTime.date} at {fileDateTime.time} • {formatFileSize(file.file_size)}
                              </div>
                              <div className="mt-2">
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {file.recording_type.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={(event) => handleDownloadClick(file, event)}
                              variant="outline"
                              size="sm"
                              disabled={downloadingFiles.has(file.id)}
                              className={downloadingFiles.has(file.id) ? "bg-blue-50 border-blue-200 text-blue-700 cursor-not-allowed opacity-75" : ""}
                            >
                              {downloadingFiles.has(file.id) ? (
                                <svg className="animate-spin h-4 w-4 mr-2 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <Download className="w-4 h-4 mr-2" />
                              )}
                              {downloadingFiles.has(file.id) 
                                ? downloadProgress[file.id] 
                                  ? `Downloading ${downloadProgress[file.id]}%` 
                                  : 'Downloading...' 
                                : 'Download'
                              }
                            </Button>
                            <Button
                              onClick={() => uploadFile(file)}
                              variant="outline"
                              size="sm"
                              className={uploadedFiles.has(file.id) ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" : ""}
                              disabled={uploadedFiles.has(file.id) || isCheckingUploads || uploadingFiles.has(file.id)}
                            >
                              {uploadedFiles.has(file.id) ? (
                                <CheckCircle className="w-4 h-4 mr-2" />
                              ) : uploadingFiles.has(file.id) ? (
                                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <Upload className="w-4 h-4 mr-2" />
                              )}
                              {uploadedFiles.has(file.id) ? 'Uploaded' : uploadingFiles.has(file.id) ? 'Uploading...' : 'Upload'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Progress Modal */}
      <UploadProgressModal
        isOpen={isUploadModalOpen}
        onClose={handleModalClose}
        files={uploadFiles}
        onUploadComplete={handleUploadComplete}
      />

      {/* Mini Progress Component */}
      {showMiniProgress && (
        <UploadProgressMini
          files={uploadFiles}
          onClose={handleMiniProgressClose}
          onOpenModal={handleOpenModal}
        />
      )}

      {/* Inline Player Modal */}
      {playingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {playingFile.file_type} - {getRecordingTypeLabel(playingFile.recording_type)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDateTime(playingFile.recording_start).date} at {formatDateTime(playingFile.recording_start).time}
                  </p>
                </div>
                <Button
                  onClick={closePlayer}
                  variant="outline"
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {playingFile.file_type === 'MP4' ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Playing with authenticated access...
                  </p>
                  <video
                    controls
                    className="w-full h-auto max-h-[60vh] border rounded-lg"
                    src={playingFile.play_url}
                  >
                    Your browser does not support the video tag.
                  </video>
                  <div className="flex space-x-4">
                    <Button asChild>
                      <a
                        href={playingFile.play_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Open in New Tab
                      </a>
                    </Button>
                    <Button
                      onClick={() => downloadFile(playingFile)}
                      disabled={downloadingFiles.has(playingFile.id)}
                      variant="outline"
                    >
                      {downloadingFiles.has(playingFile.id) ? (
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      {downloadingFiles.has(playingFile.id) 
                        ? downloadProgress[playingFile.id] 
                          ? `Downloading ${downloadProgress[playingFile.id]}%` 
                          : 'Downloading...' 
                        : 'Download'
                      }
                    </Button>
                  </div>
                </div>
              ) : playingFile.file_type === 'M4A' ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Playing with authenticated access...
                  </p>
                  <audio
                    controls
                    className="w-full"
                    src={playingFile.play_url}
                  >
                    Your browser does not support the audio tag.
                  </audio>
                  <div className="flex space-x-4">
                    <Button asChild>
                      <a
                        href={playingFile.play_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Open in New Tab
                      </a>
                    </Button>
                    <Button
                      onClick={() => downloadFile(playingFile)}
                      disabled={downloadingFiles.has(playingFile.id)}
                      variant="outline"
                    >
                      {downloadingFiles.has(playingFile.id) ? (
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <Download className="w-4 h-4 mr-2" />
                      )}
                      {downloadingFiles.has(playingFile.id) 
                        ? downloadProgress[playingFile.id] 
                          ? `Downloading ${downloadProgress[playingFile.id]}%` 
                          : 'Downloading...' 
                        : 'Download'
                      }
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Preview not available for this file type.</p>
                  <Button asChild>
                    <a
                      href={playingFile.play_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open in New Tab
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 