'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  ChevronDown,
  ChevronRight
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
  const [stats, setStats] = useState<FileStats | null>(null);
  const [playingFile, setPlayingFile] = useState<GCSFile | null>(null);
  const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const router = useRouter();

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/gcs/files');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch files');
      }
      
      setFiles(result.files || []);
      setFilteredFiles(result.files || []);
      
      // Calculate stats
      const totalSize = (result.files || []).reduce((sum: number, file: GCSFile) => sum + file.size, 0);
      const fileTypes = (result.files || []).reduce((acc: { [key: string]: number }, file: GCSFile) => {
        const ext = file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN';
        acc[ext] = (acc[ext] || 0) + 1;
        return acc;
      }, {});
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const recentUploads = (result.files || []).filter((file: GCSFile) => 
        new Date(file.timeCreated) > oneWeekAgo
      ).length;
      
      setStats({
        totalFiles: result.files?.length || 0,
        totalSize,
        fileTypes,
        recentUploads
      });
      
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

  useEffect(() => {
    // Filter and sort files
    const filtered = files.filter(file => 
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
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
  }, [files, searchTerm, sortBy, sortOrder]);

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
      const response = await fetch(`/api/gcs/download?fileName=${encodeURIComponent(fileName)}`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
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
      const response = await fetch(`/api/gcs/download?fileName=${encodeURIComponent(file.name)}`);
      
      if (!response.ok) {
        throw new Error('Failed to get file for playback');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // For text files, also fetch the content for display
      let textContent = '';
      if (file.name.toLowerCase().endsWith('.txt') || 
          file.name.toLowerCase().endsWith('.chat')) {
        const textResponse = await fetch(`/api/gcs/download?fileName=${encodeURIComponent(file.name)}`);
        if (textResponse.ok) {
          textContent = await textResponse.text();
        }
      }
      
      // Set the file with the blob URL for playback
      setPlayingFile({
        ...file,
        playUrl: url,
        textContent: textContent
      });
      
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
    if (playingFile?.playUrl) {
      window.URL.revokeObjectURL(playingFile.playUrl);
    }
    setPlayingFile(null);
  };

  const canPlayFile = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['mp4', 'm4a', 'mp3', 'wav', 'txt', 'pdf', 'chat'].includes(ext || '');
  };

  const organizeFilesByFolder = (files: GCSFile[]) => {
    const folders: { [key: string]: GCSFile[] } = {};
    
    files.forEach(file => {
      // Extract folder from file path (e.g., "zoom-recordings/allure_ima/82254035739/")
      const pathParts = file.name.split('/');
      if (pathParts.length > 1) {
        // Get the folder name (e.g., "82254035739")
        const folderName = pathParts[pathParts.length - 2] || 'Root';
        if (!folders[folderName]) {
          folders[folderName] = [];
        }
        folders[folderName].push(file);
      } else {
        // Files without folder structure
        if (!folders['Root']) {
          folders['Root'] = [];
        }
        folders['Root'].push(file);
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
                    <ChevronRight className="w-4 h-4 mr-2" />
                    Collapse All
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
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
                          <ChevronDown className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-blue-600" />
                        )}
                      </Button>
                      <Folder className="w-4 h-4 text-blue-600" />
                      <h3 className="font-semibold text-sm text-gray-700">{folderName}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {folderFiles.length} files
                      </Badge>
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
                                      {file.name.split('/').pop()}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {formatDate(file.timeCreated)} • {formatFileSize(file.size)}
                                    </div>
                                    <div className="mt-1">
                                      <Badge variant="secondary" className="text-xs">
                                        {getFileTypeLabel(file.name)}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {canPlayFile(file.name) && (
                                    <Button
                                      onClick={() => handlePlay(file)}
                                      variant="outline"
                                      size="sm"
                                      disabled={loadingStates.has(`play-${file.name}`)}
                                    >
                                      {loadingStates.has(`play-${file.name}`) ? (
                                        <>
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                                          Playing...
                                        </>
                                      ) : (
                                        <>
                                          <Play className="w-4 h-4 mr-2" />
                                          Play
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  <Button
                                    onClick={() => handleDownload(file.name)}
                                    variant="outline"
                                    size="sm"
                                    disabled={loadingStates.has(`download-${file.name}`)}
                                  >
                                    {loadingStates.has(`download-${file.name}`) ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                                        Downloading...
                                      </>
                                    ) : (
                                      <>
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                      </>
                                    )}
                                  </Button>
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {playingFile.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(playingFile.timeCreated)} • {formatFileSize(playingFile.size)}
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
              {playingFile.name.toLowerCase().endsWith('.mp4') ? (
                <div className="space-y-4">
                  <video
                    controls
                    className="w-full h-auto max-h-[60vh] border rounded-lg"
                    src={playingFile.playUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : playingFile.name.toLowerCase().endsWith('.m4a') || 
                   playingFile.name.toLowerCase().endsWith('.mp3') || 
                   playingFile.name.toLowerCase().endsWith('.wav') ? (
                <div className="space-y-4">
                  <audio
                    controls
                    className="w-full"
                    src={playingFile.playUrl}
                  >
                    Your browser does not support the audio tag.
                  </audio>
                </div>
              ) : playingFile.name.toLowerCase().endsWith('.txt') || 
                   playingFile.name.toLowerCase().endsWith('.chat') ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg max-h-[60vh] overflow-y-auto">
                    {playingFile.textContent ? (
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                        {playingFile.textContent}
                      </pre>
                    ) : (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
                        <span className="text-sm text-gray-600">Loading conversation...</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button onClick={() => handleDownload(playingFile.name)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ) : playingFile.name.toLowerCase().endsWith('.pdf') ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-gray-600">
                      PDF files need to be downloaded to view. Click the download button below.
                    </p>
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button onClick={() => handleDownload(playingFile.name)}>
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Preview not available for this file type.</p>
                  <Button onClick={() => handleDownload(playingFile.name)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download File
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