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
}

export function UploadProgressModal({ 
  isOpen, 
  onClose, 
  files, 
  onUploadComplete
}: UploadProgressModalProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>(files);
  const [overallProgress, setOverallProgress] = useState(0);

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
    if (isOpen && uploadFiles.length > 0) {
      const allCompleted = uploadFiles.every(file => 
        file.status === 'completed' || file.status === 'error'
      );
      
      if (allCompleted) {
        setTimeout(() => {
          onUploadComplete?.();
          onClose();
        }, 2000);
      }
    }
  }, [uploadFiles, isOpen, onUploadComplete, onClose]);

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
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
            <Upload className="w-6 h-6 text-blue-600" />
            Upload Progress
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Overall Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Overall Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Upload Status</span>
                <span className="text-lg font-bold text-blue-600">{Math.round(overallProgress)}%</span>
              </div>
              <Progress 
                value={overallProgress} 
                className="w-full h-4 bg-gray-100" 
              />
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{completedCount} completed, {errorCount} failed</span>
                <span className="font-medium">{totalCount} total files</span>
              </div>
            </CardContent>
          </Card>

          {/* Individual Files */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">File Details</h3>
            <div className="grid gap-4 max-h-96 overflow-y-auto">
              {uploadFiles.map((file) => (
                <Card key={file.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(file.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-4">
                          <div className="min-w-0 flex-1">
                            <div className="text-base font-semibold text-gray-900 truncate">
                              {file.name}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {formatFileSize(file.size)} • {file.type}
                            </div>
                          </div>
                          <div className="text-lg font-bold text-blue-600 ml-4">
                            {getCurrentProgress(file.id).toFixed(2)}%
                          </div>
                        </div>
                        
                        {/* Single Progress Bar */}
                        <div className="mb-4">
                          <Progress 
                            value={getCurrentProgress(file.id)} 
                            className="w-full h-3 bg-gray-200" 
                          />
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className={`text-sm font-medium ${
                            file.status === 'completed' ? 'text-green-600' :
                            file.status === 'error' ? 'text-red-600' :
                            file.status === 'uploading' ? 'text-blue-600' :
                            'text-gray-500'
                          }`}>
                            {getStatusText(file.status, file.id)}
                          </span>
                          {file.error && (
                            <span className="text-sm text-red-500 truncate max-w-64">
                              {file.error}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="px-8 py-2"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 