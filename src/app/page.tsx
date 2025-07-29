'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import moment from 'moment-timezone';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { User, Calendar, AlertCircle, CheckCircle, Clock, Video, FileText, ChevronLeft, ChevronRight, Upload, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface FormData {
  userId: string;
  fromDate?: string;
  toDate?: string;
}

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

interface Meeting {
  uuid: string;
  id: number;
  account_id: string;
  host_id: string;
  topic: string;
  type: number;
  start_time: string;
  timezone: string;
  duration: number;
  total_size: number;
  recording_count: number;
  share_url: string;
  recording_files: RecordingFile[];
  recording_play_passcode: string;
}

interface RecordingsResponse {
  from: string;
  to: string;
  page_count: number;
  page_size: number;
  total_records: number;
  next_page_token: string;
  meetings: Meeting[];
}

interface UploadStatus {
  [meetingId: number]: {
    uploaded: number;
    total: number;
    uploadedFiles: Set<string>;
  };
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<RecordingsResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [loadingActions, setLoadingActions] = useState<Set<number>>(new Set());
  const [loadingPagination, setLoadingPagination] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({});
  const [isCheckingUploads, setIsCheckingUploads] = useState(false);

  const { register, handleSubmit, setValue, watch } = useForm<FormData>();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Restore filters from URL on component mount
  useEffect(() => {
    const fromDateParam = searchParams.get('fromDate');
    const toDateParam = searchParams.get('toDate');
    const userId = searchParams.get('userId');

    if (fromDateParam) {
      const date = new Date(fromDateParam);
      setFromDate(date);
      setValue('fromDate', fromDateParam);
    }
    if (toDateParam) {
      const date = new Date(toDateParam);
      setToDate(date);
      setValue('toDate', toDateParam);
    }
    if (userId) {
      setValue('userId', userId);
    }

    // If we have filters in URL, automatically fetch recordings
    if (fromDateParam || toDateParam || userId) {
      const formData: FormData = {
        userId: userId || '',
        fromDate: fromDateParam || undefined,
        toDate: toDateParam || undefined,
      };
      handleFormSubmit(formData);
    }
  }, [searchParams, setValue]);

  // Check upload status on page load if recordings are already available
  useEffect(() => {
    if (recordings && recordings.meetings.length > 0) {
      console.log('🔄 Checking upload status on page load...');
      // Don't show toast for automatic status check
      checkAllUploadStatuses();
    }
  }, [recordings]);

  const checkAllUploadStatuses = async () => {
    if (!recordings) return;
    
    setIsCheckingUploads(true);
    try {
      // Get all meeting IDs
      const meetingIds = recordings.meetings.map(meeting => meeting.id);
      console.log('🔍 Checking upload status for all meetings:', meetingIds);
      
      // Make single request for all meeting IDs
      const response = await fetch(`/api/uploaded-files?meetingIds=${meetingIds.join(',')}`);
      const result = await response.json();
      
      if (result.success && result.uploadedFiles) {
        // Group uploaded files by meeting ID
        const uploadStatusByMeeting: UploadStatus = {};
        
        recordings.meetings.forEach(meeting => {
          const meetingUploadedFiles = result.uploadedFiles.filter(
            (file: any) => file.meetingId === meeting.id
          );
          
          const uploadedFileIds = new Set<string>();
          meetingUploadedFiles.forEach((file: any) => {
            uploadedFileIds.add(file.fileId);
          });
          
          uploadStatusByMeeting[meeting.id] = {
            uploaded: uploadedFileIds.size,
            total: meeting.recording_count,
            uploadedFiles: uploadedFileIds
          };
        });
        
        setUploadStatus(uploadStatusByMeeting);
        console.log('📊 Updated upload status for all meetings:', uploadStatusByMeeting);
      } else {
        console.log('❌ No uploaded files found for any meetings');
        // Set empty status for all meetings
        const emptyStatus: UploadStatus = {};
        recordings.meetings.forEach(meeting => {
          emptyStatus[meeting.id] = {
            uploaded: 0,
            total: meeting.recording_count,
            uploadedFiles: new Set()
          };
        });
        setUploadStatus(emptyStatus);
      }
    } catch (error) {
      console.error('Failed to check upload statuses:', error);
      // Set empty status for all meetings on error
      const emptyStatus: UploadStatus = {};
      recordings.meetings.forEach(meeting => {
        emptyStatus[meeting.id] = {
          uploaded: 0,
          total: meeting.recording_count,
          uploadedFiles: new Set()
        };
      });
      setUploadStatus(emptyStatus);
    } finally {
      setIsCheckingUploads(false);
    }
  };

  const handleFormSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    setRecordings(null);
    setCurrentPage(1);
    setUploadStatus({});

    try {
      const response = await fetch('/api/zoom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to connect to Zoom API');
      }

      toast.success(result.message || 'Recordings fetched successfully!');
      setRecordings(result.meetings);
      console.log('API Response:', result);

      // Check upload statuses after fetching recordings (silently, no toast)
      setTimeout(() => {
        checkAllUploadStatuses();
      }, 100);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recordings';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    // Update URL with filter parameters
    const params = new URLSearchParams();
    if (data.fromDate) params.set('fromDate', data.fromDate);
    if (data.toDate) params.set('toDate', data.toDate);
    if (data.userId) params.set('userId', data.userId);

    // Update URL without triggering a page reload
    const newUrl = params.toString() ? `/?${params.toString()}` : '/';
    router.replace(newUrl, { scroll: false });

    await handleFormSubmit(data);
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

  const formatDateTime = (dateString: string, timezone?: string) => {
    const date = moment.utc(dateString);
    
    if (timezone && timezone.trim() !== '') {
      date.tz(timezone);
    } else {
      // Keep in UTC if no timezone specified to avoid date shifting
      // Only format the time part to local time for display
      return {
        date: date.format('MMM DD, YYYY'),
        time: date.local().format('h:mm A'),
        timezone: 'UTC'
      };
    }
    
    return {
      date: date.format('MMM DD, YYYY'),
      time: date.format('h:mm A'),
      timezone: timezone || date.format('z')
    };
  };

  const getUploadStatusDisplay = (meetingId: number) => {
    const status = uploadStatus[meetingId];
    if (!status) return null;

    const { uploaded, total } = status;
    const percentage = total > 0 ? Math.round((uploaded / total) * 100) : 0;
    const isComplete = uploaded === total && total > 0;
    const hasUploads = uploaded > 0;

    return (
      <div className="flex items-center gap-2">
        {isComplete ? (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">All uploaded</span>
          </div>
        ) : hasUploads ? (
          <div className="flex items-center gap-1 text-blue-600">
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">{uploaded}/{total} uploaded</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-gray-500">
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">0/{total} uploaded</span>
          </div>
        )}
        {total > 0 && (
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                isComplete ? 'bg-green-500' : hasUploads ? 'bg-blue-500' : 'bg-gray-300'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  const handleViewFiles = (meetingId: number) => {
    console.log('🚀 handleViewFiles called with meetingId:', meetingId);
    console.log('🚀 Router object:', router);
    console.log('🚀 Current URL:', window.location.href);
    
    // Add loading state for this specific action
    setLoadingActions(prev => new Set(prev).add(meetingId));
    
    // Preserve current filters in the URL when navigating to files
    const currentParams = new URLSearchParams(searchParams.toString());
    const targetUrl = `/files/${meetingId}?${currentParams.toString()}`;
    console.log('🚀 Navigating to:', targetUrl);
    
    try {
      console.log('🚀 Attempting router.push...');
      router.push(targetUrl);
      console.log('✅ router.push called successfully');
    } catch (error) {
      console.error('❌ Router.push failed:', error);
      console.log('🔄 Falling back to window.location.href...');
      window.location.href = targetUrl;
    } finally {
      // Remove loading state after navigation attempt
      setTimeout(() => {
        setLoadingActions(prev => {
          const newSet = new Set(prev);
          newSet.delete(meetingId);
          return newSet;
        });
      }, 1000); // Give some time for the navigation to complete
    }
  };

  // Pagination logic
  const itemsPerPage = 10;
  const totalPages = recordings ? Math.ceil(recordings.meetings.length / itemsPerPage) : 0;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRecordings = recordings?.meetings.slice(startIndex, endIndex) || [];

  const goToPage = (page: number) => {
    setLoadingPagination(true);
    setCurrentPage(page);
    // Remove loading state after a short delay
    setTimeout(() => {
      setLoadingPagination(false);
    }, 300);
  };

  const handleFormSubmitWithDates = async (data: FormData) => {
    // Convert dates to local date strings for the API (avoiding timezone shifts)
    const formDataWithDates = {
      ...data,
      fromDate: fromDate ? format(fromDate, 'yyyy-MM-dd') : undefined,
      toDate: toDate ? format(toDate, 'yyyy-MM-dd') : undefined,
    };
    
    await handleFormSubmit(formDataWithDates);
  };

  const handleFormSubmitWithURL = async (data: FormData) => {
    // Update URL with filter parameters
    const params = new URLSearchParams();
    if (fromDate) params.set('fromDate', format(fromDate, 'yyyy-MM-dd'));
    if (toDate) params.set('toDate', format(toDate, 'yyyy-MM-dd'));
    if (data.userId) params.set('userId', data.userId);

    // Update URL without triggering a page reload
    const newUrl = params.toString() ? `/?${params.toString()}` : '/';
    router.replace(newUrl, { scroll: false });

    await handleFormSubmitWithDates(data);
  };

  return (
    <div className="min-h-full bg-background">
      <div className="p-8 w-full">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl">Dashboard</CardTitle>
            <CardDescription>
              Fetch and view your Zoom recordings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* API Configuration Status */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-blue-800 font-medium">API Configuration</span>
              </div>
              <p className="text-blue-700 text-sm mt-1">
                Your Zoom API credentials are configured via environment variables.
              </p>
            </div>

            {/* Test Form */}
            <form onSubmit={handleSubmit(handleFormSubmitWithURL)} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="userId" className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    User ID (Optional)
                  </Label>
                  <Input
                    id="userId"
                    type="text"
                    {...register('userId')}
                    placeholder="Leave empty to use current authenticated user"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Will use current authenticated user if left empty
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    From Date (Optional)
                  </Label>
                  <div className="mt-1">
                    <DatePicker
                      date={fromDate}
                      onDateChange={setFromDate}
                      placeholder="Select start date"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to show today&apos;s recordings
                  </p>
                </div>

                <div className="flex-1">
                  <Label className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    To Date (Optional)
                  </Label>
                  <div className="mt-1">
                    <DatePicker
                      date={toDate}
                      onDateChange={setToDate}
                      placeholder="Select end date"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to show today&apos;s recordings
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Fetching Recordings...' : 'Fetch Recordings'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Loading Indicator */}
        {isLoading && (
          <Card className="mb-6">
            <CardContent className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Fetching recordings from Zoom API...</span>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Recordings Display */}
        {recordings && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Video className="w-6 h-6 mr-2" />
                  Recordings ({recordings.total_records})
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  Date Range: {moment(recordings.from).format('MMM DD, YYYY')} to {moment(recordings.to).format('MMM DD, YYYY')}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {recordings.meetings.length === 0 ? (
                <div className="text-center py-8">
                  <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recordings found for the specified date range.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Meeting</TableHead>
                          <TableHead className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            Date & Time
                          </TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Files</TableHead>
                          <TableHead>Total Size</TableHead>
                          <TableHead>
                            <div className="flex items-center justify-between">
                              <span>Upload Status</span>
                              {recordings && recordings.meetings.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={checkAllUploadStatuses}
                                  disabled={isCheckingUploads}
                                  className="h-6 w-6 p-0"
                                >
                                  {isCheckingUploads ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentRecordings.map((meeting) => {
                          const dateTime = formatDateTime(meeting.start_time, meeting.timezone);
                          return (
                            <TableRow key={meeting.uuid}>
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                      <Video className="w-4 h-4 text-primary" />
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="font-medium">
                                      {meeting.topic}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      ID: {meeting.id}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">
                                    {dateTime.date}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {dateTime.time} ({dateTime.timezone})
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {formatDuration(meeting.duration)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {meeting.recording_count} files
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {formatFileSize(meeting.total_size)}
                              </TableCell>
                              <TableCell>
                                {isCheckingUploads ? (
                                  <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                    <span className="text-sm text-muted-foreground">Checking...</span>
                                  </div>
                                ) : (
                                  getUploadStatusDisplay(meeting.id)
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    console.log('🔘 View Files button clicked for meeting:', meeting.id);
                                    handleViewFiles(meeting.id);
                                  }}
                                  disabled={loadingActions.has(meeting.id)}
                                >
                                  {loadingActions.has(meeting.id) ? (
                                    <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  ) : (
                                    <FileText className="w-4 h-4 mr-2" />
                                  )}
                                  View Files
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(endIndex, recordings.meetings.length)} of {recordings.meetings.length} recordings
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1 || loadingPagination}
                        >
                          {loadingPagination ? (
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <ChevronLeft className="w-4 h-4" />
                          )}
                        </Button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(page)}
                            disabled={loadingPagination}
                          >
                            {page}
                          </Button>
                        ))}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages || loadingPagination}
                        >
                          {loadingPagination ? (
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 