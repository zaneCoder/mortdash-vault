'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Database, 
  FileText, 
  Upload, 
  Download, 
  Trash2,
  RefreshCw,
  HardDrive
} from 'lucide-react';

interface LogEntry {
  _id: string;
  action: string;
  meetingId?: string;
  fileName?: string;
  fileSize?: number;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
  details?: string;
}

interface DatabaseStats {
  totalFiles: number;
  totalSize: number;
  uploadCount: number;
  downloadCount: number;
  deleteCount: number;
  lastActivity: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upload' | 'download' | 'delete'>('all');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/logs');
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      const data = await response.json();
      setLogs(data.logs || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    // Only refresh data, don't reload the entire page
    await fetchLogs();
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'upload':
        return <Upload className="w-4 h-4" />;
      case 'download':
        return <Download className="w-4 h-4" />;
      case 'delete':
        return <Trash2 className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.action.toLowerCase().includes(filter);
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="text-muted-foreground">Loading logs...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Logs</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchLogs}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
          <Activity className="w-6 h-6" />
          System Logs & Analytics
        </h1>
        <p className="text-muted-foreground">
          View MongoDB logs and system activity summary
        </p>
      </div>

      {/* Database Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
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
                <HardDrive className="w-5 h-5 text-purple-600" />
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
                <Upload className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium">Uploads</div>
                  <div className="text-lg font-semibold">{stats.uploadCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-orange-600" />
                <div>
                  <div className="text-sm font-medium">Downloads</div>
                  <div className="text-lg font-semibold">{stats.downloadCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm font-medium">Filter:</span>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'upload' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('upload')}
        >
          <Upload className="w-4 h-4 mr-2" />
          Uploads
        </Button>
        <Button
          variant={filter === 'download' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('download')}
        >
          <Download className="w-4 h-4 mr-2" />
          Downloads
        </Button>
        <Button
          variant={filter === 'delete' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('delete')}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Deletes
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="ml-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Activity Logs ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No logs found for the selected filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div
                  key={log._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <span className="font-medium capitalize">{log.action}</span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {log.fileName && (
                        <span className="mr-4">File: {log.fileName}</span>
                      )}
                      {log.fileSize && (
                        <span className="mr-4">Size: {formatFileSize(log.fileSize)}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {getStatusBadge(log.status)}
                    <div className="text-sm text-muted-foreground">
                      {formatDate(log.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 