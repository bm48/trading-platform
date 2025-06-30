import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';

interface ComingSoonOverlayProps {
  children: ReactNode;
  feature: string;
  reason?: string;
  showChildren?: boolean;
}

export default function ComingSoonOverlay({ 
  children, 
  feature, 
  reason = "This feature requires Google app verification which is currently in progress.",
  showChildren = true 
}: ComingSoonOverlayProps) {
  return (
    <div className="relative">
      {/* Overlay */}
      <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
        <Card className="max-w-md mx-4 shadow-lg border-amber-200 bg-amber-50">
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-amber-100 rounded-full">
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Coming Soon
              </Badge>
              <h3 className="text-lg font-semibold text-gray-900">
                {feature}
              </h3>
              <p className="text-sm text-gray-600">
                {reason}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                We'll notify you when this feature is available.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Original content (dimmed) */}
      {showChildren && (
        <div className="opacity-30 pointer-events-none">
          {children}
        </div>
      )}
    </div>
  );
}