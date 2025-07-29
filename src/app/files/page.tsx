import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function FilesPage() {
  return (
    <div className="min-h-full bg-background">
      <div className="p-8 max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-6 h-6 mr-2" />
              Files
            </CardTitle>
            <CardDescription>
              Browse and manage all your files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page will contain the files browser interface.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 