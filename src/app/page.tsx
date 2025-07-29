'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import moment from 'moment-timezone';
import { message } from '@/components/ui/message';
import { User, Calendar, AlertCircle, CheckCircle, Clock, Video, FileText, Upload, ChevronLeft, ChevronRight } from 'lucide-react';

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

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<RecordingsResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { register, handleSubmit, setValue, watch } = useForm<FormData>();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Restore filters from URL on component mount
  useEffect(() => {
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const userId = searchParams.get('userId');

    if (fromDate) {
      setValue('fromDate', fromDate);
    }
    if (toDate) {
      setValue('toDate', toDate);
    }
    if (userId) {
      setValue('userId', userId);
    }

    // If we have filters in URL, automatically fetch recordings
    if (fromDate || toDate || userId) {
      const formData: FormData = {
        userId: userId || '',
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      };
      handleFormSubmit(formData);
    }
  }, [searchParams, setValue]);

  const handleFormSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    setRecordings(null);
    setCurrentPage(1);

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

      message.success(result.message || 'Recordings fetched successfully!');
      setRecordings(result.meetings);
      console.log('API Response:', result);

    } catch (error: any) {
      setError(error.message);
      message.error(error.message || 'Failed to fetch recordings');
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
    
    if (timezone) {
      date.tz(timezone);
    } else {
      date.local(); // Convert to local timezone if no timezone specified
    }
    
    return {
      date: date.format('MMM DD, YYYY'),
      time: date.format('h:mm A'),
      timezone: timezone || date.format('z')
    };
  };

  const handleViewFiles = (meetingId: number) => {
    console.log('🚀 handleViewFiles called with meetingId:', meetingId);
    console.log('🚀 Router object:', router);
    console.log('🚀 Current URL:', window.location.href);
    
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
    }
  };

  const handleUploadToS3 = (meetingId: number) => {
    console.log('Upload to S3 for meeting:', meetingId);
    // TODO: Implement S3 upload functionality
  };

  // Pagination logic
  const itemsPerPage = 10;
  const totalPages = recordings ? Math.ceil(recordings.meetings.length / itemsPerPage) : 0;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRecordings = recordings?.meetings.slice(startIndex, endIndex) || [];

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Zoom Recordings Dashboard
          </h1>
          <p className="text-gray-600 mb-6">
            Fetch and view your Zoom recordings
          </p>

          {/* API Configuration Status */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">API Configuration</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              Your Zoom API credentials are configured via environment variables.
            </p>
          </div>

          {/* Test Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  User ID (Optional)
                </label>
                <input
                  type="text"
                  {...register('userId')}
                  className="text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty to use current authenticated user"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Will use current authenticated user if left empty
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  From Date (Optional)
                </label>
                <input
                  type="date"
                  {...register('fromDate')}
                  className="text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to show today&apos;s recordings
                </p>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  To Date (Optional)
                </label>
                <input
                  type="date"
                  {...register('toDate')}
                  className="text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to show today&apos;s recordings
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Fetching Recordings...' : 'Fetch Recordings'}
            </button>
          </form>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-700">Fetching recordings from Zoom API...</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800 font-medium">Error</span>
            </div>
            <p className="text-red-700 mt-2">{error}</p>
          </div>
        )}

        {/* Recordings Display */}
        {recordings && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                <Video className="w-6 h-6 inline mr-2" />
                Recordings ({recordings.total_records})
              </h2>
              <div className="text-sm text-gray-500">
                Date Range: {moment(recordings.from).format('MMM DD, YYYY')} to {moment(recordings.to).format('MMM DD, YYYY')}
              </div>
            </div>

            {recordings.meetings.length === 0 ? (
              <div className="text-center py-8">
                <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No recordings found for the specified date range.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Meeting
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Date & Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Files
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Size
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentRecordings.map((meeting) => {
                        const dateTime = formatDateTime(meeting.start_time, meeting.timezone);
                        return (
                          <tr key={meeting.uuid} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="flex-shrink-0">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Video className="w-4 h-4 text-blue-600" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {meeting.topic}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    ID: {meeting.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {dateTime.date}
                              </div>
                              <div className="text-sm text-gray-500">
                                {dateTime.time} ({dateTime.timezone})
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDuration(meeting.duration)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                {meeting.recording_count} files
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatFileSize(meeting.total_size)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => {
                                  console.log('🔘 View Files button clicked for meeting:', meeting.id);
                                  handleViewFiles(meeting.id);
                                }}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                View Files
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-700">
                      Showing {startIndex + 1} to {Math.min(endIndex, recordings.meetings.length)} of {recordings.meetings.length} recordings
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
