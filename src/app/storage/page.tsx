import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from 'lucide-react';

export default function StoragePage() {
  return (
    <div className="min-h-full bg-background">
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-6 h-6 mr-2" />
              Storage
            </CardTitle>
            <CardDescription>
              Monitor and manage your storage usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page will contain the storage management interface.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 