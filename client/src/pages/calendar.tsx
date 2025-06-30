import { Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function CalendarPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-gray-600">Legal calendar and deadline management</p>
        </div>
      </div>

      {/* Coming Soon Message */}
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="h-16 w-16 text-gray-400 mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Calendar Integration Coming Soon</h2>
          <p className="text-gray-600 mb-4 max-w-md">
            We're working on integrating Google Calendar and Outlook to help you manage legal deadlines and appointments. 
            This feature will be available soon!
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg">
            <h3 className="font-medium text-blue-900 mb-2">What's coming:</h3>
            <ul className="text-sm text-blue-800 space-y-1 text-left">
              <li>• Automatic case deadline syncing</li>
              <li>• Google Calendar integration</li>
              <li>• Outlook Calendar integration</li>
              <li>• Legal event reminders</li>
              <li>• Court date notifications</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}