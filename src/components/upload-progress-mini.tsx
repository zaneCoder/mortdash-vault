'use client';

import { Progress } from '@/components/ui/progress';
import { Upload, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface UploadProgressMiniProps {
  files: UploadFile[];
  onClose: () => void;
  onOpenModal: () => void;
}

export function UploadProgressMini({ files, onClose, onOpenModal }: UploadProgressMiniProps) {
  const overallProgress = files.length > 0 
    ? Math.round(files.reduce((sum, file) => sum + file.progress, 0) / files.length)
    : 0;

  const completedCount = files.filter(f => f.status === 'completed').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const uploadingCount = files.filter(f => f.status === 'uploading').length;
  const totalCount = files.length;

  const getStatusIcon = () => {
    if (errorCount > 0) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (completedCount === totalCount) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (uploadingCount > 0) return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    return <Upload className="w-4 h-4 text-gray-500" />;
  };

  const getStatusText = () => {
    if (errorCount > 0) return `${errorCount} failed`;
    if (completedCount === totalCount) return 'Completed';
    if (uploadingCount > 0) return `${uploadingCount} uploading`;
    return `${completedCount}/${totalCount} done`;
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-gray-900">Upload Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenModal}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Details
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">{getStatusText()}</span>
          <span className="text-xs font-semibold text-blue-600">{overallProgress}%</span>
        </div>
        <Progress 
          value={overallProgress} 
          className="w-full h-2 bg-gray-100" 
        />
        <div className="text-xs text-gray-500">
          {completedCount} completed, {errorCount} failed, {totalCount} total
        </div>
      </div>
    </div>
  );
} 