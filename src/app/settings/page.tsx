import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="min-h-full bg-background">
      <div className="p-8 max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-6 h-6 mr-2" />
              Settings
            </CardTitle>
            <CardDescription>
              Configure your application settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page will contain the settings configuration interface.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 