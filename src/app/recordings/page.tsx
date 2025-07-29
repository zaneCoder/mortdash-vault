import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Video } from 'lucide-react';

export default function RecordingsPage() {
  return (
    <div className="min-h-full bg-background">
      <div className="p-8 max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Video className="w-6 h-6 mr-2" />
              Recordings
            </CardTitle>
            <CardDescription>
              Manage and view all your Zoom recordings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page will contain the recordings management interface.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 