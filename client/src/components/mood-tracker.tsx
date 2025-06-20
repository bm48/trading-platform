import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { MoodData, getMoodEmoji } from '@/lib/mood-utils';
import { Edit3, Heart } from 'lucide-react';

interface MoodTrackerProps {
  caseId: number;
  currentMoodData?: MoodData;
}

export function MoodTracker({ caseId, currentMoodData }: MoodTrackerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [moodScore, setMoodScore] = useState(currentMoodData?.moodScore || 5);
  const [stressLevel, setStressLevel] = useState<'low' | 'medium' | 'high' | 'critical'>(currentMoodData?.stressLevel || 'medium');
  const [urgencyFeeling, setUrgencyFeeling] = useState<'calm' | 'moderate' | 'urgent' | 'panic'>(currentMoodData?.urgencyFeeling || 'moderate');
  const [confidenceLevel, setConfidenceLevel] = useState(currentMoodData?.confidenceLevel || 5);
  const [clientSatisfaction, setClientSatisfaction] = useState(currentMoodData?.clientSatisfaction || 5);
  const [moodNotes, setMoodNotes] = useState(currentMoodData?.moodNotes || '');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMoodMutation = useMutation({
    mutationFn: async (moodData: Partial<MoodData>) => {
      return apiRequest('PUT', `/api/cases/${caseId}/mood`, moodData);
    },
    onSuccess: () => {
      toast({
        title: "Mood Updated",
        description: "Case mood tracking has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cases', caseId] });
      setIsOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update mood data",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const moodData = {
      moodScore,
      stressLevel,
      urgencyFeeling,
      confidenceLevel,
      clientSatisfaction,
      moodNotes: moodNotes.trim() || undefined,
      lastMoodUpdate: new Date().toISOString(),
    };

    updateMoodMutation.mutate(moodData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="space-x-2">
          <Heart className="h-4 w-4" />
          <span>Track Mood</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-pink-500" />
            <span>Update Case Mood</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overall Mood Score */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Overall Mood {getMoodEmoji('mood', moodScore)}
            </Label>
            <div className="space-y-2">
              <Slider
                value={[moodScore]}
                onValueChange={(value) => setMoodScore(value[0])}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>😞 Very Negative</span>
                <span className="font-medium">{moodScore}/10</span>
                <span>🤩 Very Positive</span>
              </div>
            </div>
          </div>

          {/* Stress Level */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Stress Level {getMoodEmoji('stress', stressLevel)}
            </Label>
            <Select value={stressLevel} onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => setStressLevel(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">😌 Low - Feeling calm and relaxed</SelectItem>
                <SelectItem value="medium">😬 Medium - Some stress but manageable</SelectItem>
                <SelectItem value="high">😰 High - Feeling overwhelmed</SelectItem>
                <SelectItem value="critical">🚨 Critical - Extremely stressed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Urgency Feeling */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Urgency Feeling {getMoodEmoji('urgency', urgencyFeeling)}
            </Label>
            <Select value={urgencyFeeling} onValueChange={(value: 'calm' | 'moderate' | 'urgent' | 'panic') => setUrgencyFeeling(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calm">🧘 Calm - No rush, proceeding steadily</SelectItem>
                <SelectItem value="moderate">⏰ Moderate - Some time pressure</SelectItem>
                <SelectItem value="urgent">🏃 Urgent - Need quick resolution</SelectItem>
                <SelectItem value="panic">🔥 Panic - Extremely time-sensitive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Confidence Level */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Confidence in Case Outcome {getMoodEmoji('confidence', confidenceLevel)}
            </Label>
            <div className="space-y-2">
              <Slider
                value={[confidenceLevel]}
                onValueChange={(value) => setConfidenceLevel(value[0])}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>😨 No Confidence</span>
                <span className="font-medium">{confidenceLevel}/10</span>
                <span>🦾 Very Confident</span>
              </div>
            </div>
          </div>

          {/* Client Satisfaction */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              Client Satisfaction {getMoodEmoji('satisfaction', clientSatisfaction)}
            </Label>
            <div className="space-y-2">
              <Slider
                value={[clientSatisfaction]}
                onValueChange={(value) => setClientSatisfaction(value[0])}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>😡 Very Dissatisfied</span>
                <span className="font-medium">{clientSatisfaction}/10</span>
                <span>🥳 Extremely Happy</span>
              </div>
            </div>
          </div>

          {/* Mood Notes */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Additional Notes</Label>
            <Textarea
              value={moodNotes}
              onChange={(e) => setMoodNotes(e.target.value)}
              placeholder="Share any additional thoughts about how this case is going..."
              rows={3}
            />
          </div>

          {/* Preview */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <span>Overall:</span>
                  <span className="text-lg">{getMoodEmoji('mood', moodScore)}</span>
                  <span>{moodScore}/10</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>Stress:</span>
                  <span className="text-lg">{getMoodEmoji('stress', stressLevel)}</span>
                  <span>{stressLevel}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>Urgency:</span>
                  <span className="text-lg">{getMoodEmoji('urgency', urgencyFeeling)}</span>
                  <span>{urgencyFeeling}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={updateMoodMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={updateMoodMutation.isPending}
            >
              {updateMoodMutation.isPending ? "Updating..." : "Update Mood"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}