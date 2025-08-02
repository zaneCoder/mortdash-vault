'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface UploadProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: UploadFile[];
  onUploadComplete?: () => void;
  onCancelAll?: () => void;
  onCancelFile?: (fileId: string) => void;
}

export function UploadProgressModal({ 
  isOpen, 
  onClose, 
  files, 
  onUploadComplete,
  onCancelAll,
  onCancelFile
}: UploadProgressModalProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>(files);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isCancelled, setIsCancelled] = useState(false);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setUploadFiles(files);
  }, [files]);

  useEffect(() => {
    if (uploadFiles.length > 0) {
      // Simple overall progress calculation
      const totalProgress = uploadFiles.reduce((sum, file) => sum + file.progress, 0);
      const averageProgress = totalProgress / uploadFiles.length;
      setOverallProgress(averageProgress);
    }
  }, [uploadFiles]);

  useEffect(() => {
    if (isOpen && uploadFiles.length === 0) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      
      setAutoCloseTimer(timer);
      
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [isOpen, uploadFiles.length, onClose]);

  useEffect(() => {
    if (isOpen && uploadFiles.length > 0) {
      const allCompleted = uploadFiles.every(file => 
        file.status === 'completed' || file.status === 'error'
      );
      
      if (allCompleted) {
        // Clear any existing timer
        if (autoCloseTimer) {
          clearTimeout(autoCloseTimer);
        }
        
        // If all files were cancelled, delay closing for 3-5 seconds
        const cancelledCount = uploadFiles.filter(f => f.status === 'error' && f.error === 'Upload cancelled').length;
        const delay = cancelledCount > 0 ? Math.random() * 2000 + 3000 : 2000; // 3-5 seconds if cancelled, 2 seconds otherwise
        
        const timer = setTimeout(() => {
          onUploadComplete?.();
          onClose();
          setIsCancelled(false);
        }, delay);
        
        setAutoCloseTimer(timer);
      }
    }
    
    // Cleanup timer on unmount
    return () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
    };
  }, [uploadFiles, isOpen, onUploadComplete, onClose]); // Removed autoCloseTimer from dependencies

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'uploading':
        return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
      default:
        return <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStatusText = (status: string, fileId: string) => {
    const file = uploadFiles.find(f => f.id === fileId);
    if (!file) return 'Unknown';

    if (status === 'completed') {
      return 'Complete';
    }
    if (status === 'error') {
        return 'Failed';
    }
    if (status === 'uploading') {
      return 'Uploading';
    }
    
        return 'Pending';
  };

  const getCurrentProgress = (fileId: string) => {
    const file = uploadFiles.find(f => f.id === fileId);
    if (!file) return 0;

    // If file is completed, show 100%
    if (file.status === 'completed') {
      return 100;
    }
    
    return file.progress;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const completedCount = uploadFiles.filter(f => f.status === 'completed').length;
  const errorCount = uploadFiles.filter(f => f.status === 'error').length;
  const totalCount = uploadFiles.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
            <Upload className="w-5 h-5 text-blue-600" />
            Upload Progress
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto max-h-[calc(80vh-100px)]">
          {/* Overall Progress Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Overall Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Upload Status</span>
                <span className="text-base font-bold text-blue-600">{Math.round(overallProgress)}%</span>
              </div>
              <Progress 
                value={overallProgress} 
                className="w-full h-3 bg-gray-100" 
              />
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{completedCount} completed, {errorCount} failed</span>
                <span className="font-medium">{totalCount} total files</span>
              </div>
            </CardContent>
          </Card>

          {/* Individual Files */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-gray-900">File Details</h3>
            <div className="grid gap-3 max-h-64 overflow-y-auto">
              {uploadFiles.map((file) => (
                <Card key={file.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(file.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {file.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatFileSize(file.size)} • {file.type}
                            </div>
                          </div>
                          <div className="text-base font-bold text-blue-600 ml-3">
                            {getCurrentProgress(file.id).toFixed(1)}%
                          </div>
                        </div>
                        
                        {/* Single Progress Bar */}
                        <div className="mb-3">
                          <Progress 
                            value={getCurrentProgress(file.id)} 
                            className="w-full h-2 bg-gray-200" 
                          />
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className={`text-xs font-medium ${
                            file.status === 'completed' ? 'text-green-600' :
                            file.status === 'error' ? 'text-red-600' :
                            file.status === 'uploading' ? 'text-blue-600' :
                            'text-gray-500'
                          }`}>
                            {getStatusText(file.status, file.id)}
                          </span>
                          <div className="flex items-center gap-2">
                            {file.error && (
                              <span className="text-xs text-red-500 truncate max-w-48">
                                {file.error}
                              </span>
                            )}
                            {onCancelFile && (file.status === 'uploading' || file.status === 'pending') && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => onCancelFile(file.id)}
                                className="bg-red-600 hover:bg-red-700 h-5 px-2 text-xs"
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center gap-3 pt-3 border-t border-gray-200">
            <div className="flex gap-2">
              {onCancelAll && uploadFiles.some(f => f.status === 'uploading' || f.status === 'pending') && (
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    onCancelAll();
                    setIsCancelled(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-sm"
                >
                  Cancel All
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="px-6 py-2 text-sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 