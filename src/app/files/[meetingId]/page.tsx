'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import moment from 'moment-timezone';
import { message } from '@/components/ui/message';
import { 
  ArrowLeft, 
  Video, 
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
  X
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

export default function FilesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = params.meetingId as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<MeetingRecordings | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [playingFile, setPlayingFile] = useState<RecordingFile | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (meetingId) {
      fetchRecordings();
    }
  }, [meetingId]);

  const fetchRecordings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/zoom/meeting/${meetingId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch meeting recordings');
      }

      setRecordings(result.recordings);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

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
    const date = moment.utc(dateString).local();
    return {
      date: date.format('MMM DD, YYYY'),
      time: date.format('h:mm A'),
      timezone: date.format('z')
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
        return <FileText className="w-5 h-5 text-gray-600" />;
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
      setIsDownloading(true);
      
      const response = await fetch('/api/zoom/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl: file.download_url,
          meetingId: recordings?.id
        }),
      });

      console.log('📡 Download response status:', response.status);
      console.log('📡 Download response ok:', response.ok);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Download error response:', error);
        throw new Error(error.error || 'Download failed');
      }

      // Create a blob from the response and trigger download
      const blob = await response.blob();
      console.log('📦 Blob size:', blob.size, 'bytes');
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recordings?.topic || 'Meeting'}_${file.file_type}_${file.id}.${file.file_extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('✅ Download completed for file:', file.id);
      message.success(`Downloaded ${file.file_type} file successfully!`);
      
    } catch (error) {
      console.error('❌ Download failed for file:', file.id, error);
      message.error('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const uploadFile = async (file: RecordingFile) => {
    setUploadingFiles(prev => new Set(prev).add(file.id));
    setUploadProgress(prev => ({ ...prev, [file.id]: 0 }));

    try {
      console.log('🚀 Starting GCS upload for file:', file.id);
      
      const response = await fetch('/api/gcs/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl: file.download_url,
          fileName: `${file.file_type}_${file.id}.${file.file_extension}`,
          fileType: file.file_type,
          meetingId: recordings?.id
        }),
      });

      console.log('📡 GCS upload response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ GCS upload error response:', error);
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      console.log('✅ GCS upload successful:', result);
      
      message.success(`Uploaded ${file.file_type} file to Google Cloud Storage!`);
      
    } catch (error) {
      console.error('❌ GCS upload failed for file:', file.id, error);
      message.error('Upload failed. Please try again.');
    } finally {
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.id);
        return newSet;
      });
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[file.id];
        return newProgress;
      });
    }
  };

  const uploadAllFiles = async () => {
    if (!recordings) return;

    const allFiles = recordings.recording_files;
    console.log('🚀 Starting bulk GCS upload for', allFiles.length, 'files');

    for (const file of allFiles) {
      await uploadFile(file);
    }

    message.success(`Uploaded ${allFiles.length} files to Google Cloud Storage!`);
  };

  const playFile = (file: RecordingFile) => {
    console.log('🎬 Playing file:', file.file_type);
    console.log('🔗 Original play URL:', file.play_url);
    console.log('🔑 Passcode available:', !!recordings?.recording_play_passcode);
    console.log('🔑 Download access token available:', !!recordings?.download_access_token);
    
    let authenticatedPlayUrl = file.play_url;
    
    // Add passcode to play URL if available
    if (recordings?.recording_play_passcode && recordings.recording_play_passcode !== '') {
      authenticatedPlayUrl = `${file.play_url}?pwd=${recordings.recording_play_passcode}`;
      console.log('🔗 Play URL with passcode:', authenticatedPlayUrl);
    }
    
    // Add download access token for authenticated access
    if (recordings?.download_access_token) {
      const separator = authenticatedPlayUrl.includes('?') ? '&' : '?';
      authenticatedPlayUrl = `${authenticatedPlayUrl}${separator}access_token=${recordings.download_access_token}`;
      console.log('🔗 Play URL with access token:', authenticatedPlayUrl);
    }
    
    const fileWithAuth = {
      ...file,
      play_url: authenticatedPlayUrl
    };
    setPlayingFile(fileWithAuth);
  };

  const closePlayer = () => {
    setPlayingFile(null);
  };

  const handleBackNavigation = () => {
    // Preserve search parameters when going back
    const currentParams = new URLSearchParams(searchParams.toString());
    const backUrl = currentParams.toString() ? `/?${currentParams.toString()}` : '/';
    router.push(backUrl);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-700">Loading meeting recordings...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800 font-medium">Error</span>
            </div>
            <p className="text-red-700 mt-2">{error}</p>
            <button
              onClick={handleBackNavigation}
              className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!recordings) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-500">No recordings found.</p>
          </div>
        </div>
      </div>
    );
  }

  const dateTime = formatDateTime(recordings.start_time);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={handleBackNavigation}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  <Video className="w-6 h-6 inline mr-2" />
                  Meeting Files
                </h1>
                <p className="text-gray-600 mt-1">{recordings.topic}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Meeting ID: {recordings.id}</div>
                <div className="text-sm text-gray-500">{dateTime.date} at {dateTime.time}</div>
              </div>
              <button
                onClick={uploadAllFiles}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload All Files
              </button>
            </div>
          </div>
        </div>

        {/* Meeting Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-gray-400 mr-2" />
              <div>
                <div className="text-sm font-medium text-gray-900">Duration</div>
                <div className="text-sm text-gray-500">{formatDuration(recordings.duration)}</div>
              </div>
            </div>
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-gray-400 mr-2" />
              <div>
                <div className="text-sm font-medium text-gray-900">Files</div>
                <div className="text-sm text-gray-500">{recordings.recording_count} files</div>
              </div>
            </div>
            <div className="flex items-center">
              <HardDrive className="w-5 h-5 text-gray-400 mr-2" />
              <div>
                <div className="text-sm font-medium text-gray-900">Total Size</div>
                <div className="text-sm text-gray-500">{formatFileSize(recordings.total_size)}</div>
              </div>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
              <div>
                <div className="text-sm font-medium text-gray-900">Status</div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recording Files */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Recording Files ({recordings.recording_files.length})
          </h2>

          {recordings.recording_files.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recording files found for this meeting.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recordings.recording_files.map((file) => {
                const fileDateTime = formatDateTime(file.recording_start);
                return (
                  <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getFileIcon(file.file_type)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {file.file_type} - {getRecordingTypeLabel(file.recording_type)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {fileDateTime.date} at {fileDateTime.time} • {formatFileSize(file.file_size)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {file.recording_type.replace(/_/g, ' ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => playFile(file)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Play
                        </button>
                        <button
                          onClick={() => downloadFile(file)}
                          className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </button>
                        <button
                          onClick={() => uploadFile(file)}
                          disabled={uploadingFiles.has(file.id)}
                          className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {uploadingFiles.has(file.id) ? (
                            <svg className="animate-spin h-4 w-4 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          {uploadingFiles.has(file.id) ? 'Uploading...' : 'Upload'}
                        </button>
                      </div>
                      
                      {/* Upload Progress */}
                      {uploadingFiles.has(file.id) && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Uploading...</span>
                            <span>{uploadProgress[file.id] || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress[file.id] || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Inline Player Modal */}
      {playingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {playingFile.file_type} - {getRecordingTypeLabel(playingFile.recording_type)}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatDateTime(playingFile.recording_start).date} at {formatDateTime(playingFile.recording_start).time}
                </p>
              </div>
              <button
                onClick={closePlayer}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {playingFile.file_type === 'MP4' ? (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Playing with authenticated access...
                  </p>
                  <div className="space-y-4">
                    <video
                      controls
                      className="w-full h-auto max-h-[60vh] border rounded-lg"
                      src={playingFile.play_url}
                    >
                      Your browser does not support the video tag.
                    </video>
                    <div className="flex space-x-4">
                      <a
                        href={playingFile.play_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Open in New Tab
                      </a>
                      <button
                        onClick={() => downloadFile(playingFile)}
                        disabled={isDownloading}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        {isDownloading ? (
                          <div className="animate-spin h-4 w-4 text-white mr-2" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        {isDownloading ? 'Downloading...' : 'Download'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : playingFile.file_type === 'M4A' ? (
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Playing with authenticated access...
                  </p>
                  <div className="space-y-4">
                    <audio
                      controls
                      className="w-full"
                      src={playingFile.play_url}
                    >
                      Your browser does not support the audio tag.
                    </audio>
                    <div className="flex space-x-4">
                      <a
                        href={playingFile.play_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Open in New Tab
                      </a>
                      <button
                        onClick={() => downloadFile(playingFile)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Preview not available for this file type.</p>
                  <a
                    href={playingFile.play_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Open in New Tab
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 