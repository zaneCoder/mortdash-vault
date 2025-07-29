import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload } from 'lucide-react';

export default function UploadPage() {
  return (
    <div className="min-h-full bg-background">
      <div className="p-8 max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="w-6 h-6 mr-2" />
              Upload
            </CardTitle>
            <CardDescription>
              Upload files to your vault
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page will contain the file upload interface.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 