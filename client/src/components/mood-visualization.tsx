import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { 
  MoodData, 
  getMoodEmoji, 
  getMoodColor, 
  getStressColor, 
  getUrgencyColor,
  getMoodSummary,
  getOverallMoodEmoji,
  generateMoodInsights
} from '@/lib/mood-utils';
import { format } from 'date-fns';

interface MoodVisualizationProps {
  moodData: MoodData;
  showDetails?: boolean;
  compact?: boolean;
}

export function MoodVisualization({ moodData, showDetails = true, compact = false }: MoodVisualizationProps) {
  const overallMoodEmoji = getOverallMoodEmoji(moodData);
  const moodSummary = getMoodSummary(moodData);
  const insights = generateMoodInsights(moodData);

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <Tooltip>
          <TooltipTrigger>
            <span className="text-2xl">{overallMoodEmoji}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{moodSummary}</p>
          </TooltipContent>
        </Tooltip>
        <div className="flex space-x-1">
          <Badge variant="outline" className={getStressColor(moodData.stressLevel)}>
            {getMoodEmoji('stress', moodData.stressLevel)} {moodData.stressLevel}
          </Badge>
          <Badge variant="outline" className={getUrgencyColor(moodData.urgencyFeeling)}>
            {getMoodEmoji('urgency', moodData.urgencyFeeling)} {moodData.urgencyFeeling}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <Card className="mood-visualization">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-3">
          <span className="text-3xl">{overallMoodEmoji}</span>
          <div>
            <h3 className="text-lg font-semibold">Case Mood Overview</h3>
            <p className={`text-sm ${getMoodColor(moodData.moodScore)}`}>
              {moodSummary}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Mood Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Overall Mood */}
          <div className="text-center">
            <div className="text-2xl mb-1">{getMoodEmoji('mood', moodData.moodScore)}</div>
            <div className="text-sm font-medium">Overall Mood</div>
            <div className={`text-xs ${getMoodColor(moodData.moodScore)}`}>
              {moodData.moodScore}/10
            </div>
          </div>

          {/* Stress Level */}
          <div className="text-center">
            <div className="text-2xl mb-1">{getMoodEmoji('stress', moodData.stressLevel)}</div>
            <div className="text-sm font-medium">Stress Level</div>
            <div className={`text-xs ${getStressColor(moodData.stressLevel)}`}>
              {moodData.stressLevel}
            </div>
          </div>

          {/* Urgency */}
          <div className="text-center">
            <div className="text-2xl mb-1">{getMoodEmoji('urgency', moodData.urgencyFeeling)}</div>
            <div className="text-sm font-medium">Urgency</div>
            <div className={`text-xs ${getUrgencyColor(moodData.urgencyFeeling)}`}>
              {moodData.urgencyFeeling}
            </div>
          </div>

          {/* Confidence */}
          <div className="text-center">
            <div className="text-2xl mb-1">{getMoodEmoji('confidence', moodData.confidenceLevel)}</div>
            <div className="text-sm font-medium">Confidence</div>
            <div className={`text-xs ${getMoodColor(moodData.confidenceLevel)}`}>
              {moodData.confidenceLevel}/10
            </div>
          </div>
        </div>

        {showDetails && (
          <>
            {/* Progress Bars */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Overall Mood</span>
                  <span>{moodData.moodScore}/10</span>
                </div>
                <Progress value={moodData.moodScore * 10} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Confidence Level</span>
                  <span>{moodData.confidenceLevel}/10</span>
                </div>
                <Progress value={moodData.confidenceLevel * 10} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Client Satisfaction</span>
                  <span>{moodData.clientSatisfaction}/10</span>
                </div>
                <Progress value={moodData.clientSatisfaction * 10} className="h-2" />
              </div>
            </div>

            {/* Mood Insights */}
            {insights.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Mood Insights</h4>
                <div className="space-y-1">
                  {insights.map((insight, index) => (
                    <div key={index} className="text-xs text-muted-foreground flex items-start space-x-2">
                      <span className="text-blue-500">💡</span>
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mood Notes */}
            {moodData.moodNotes && (
              <div>
                <h4 className="text-sm font-semibold mb-1">Notes</h4>
                <p className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                  {moodData.moodNotes}
                </p>
              </div>
            )}

            {/* Last Updated */}
            {moodData.lastMoodUpdate && (
              <div className="text-xs text-muted-foreground text-right">
                Last updated: {format(new Date(moodData.lastMoodUpdate), 'MMM d, yyyy h:mm a')}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Quick mood indicator for lists and cards
export function MoodIndicator({ moodData }: { moodData: MoodData }) {
  const overallMoodEmoji = getOverallMoodEmoji(moodData);
  const moodSummary = getMoodSummary(moodData);

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="flex items-center space-x-1">
          <span className="text-lg">{overallMoodEmoji}</span>
          <div className="flex space-x-1">
            <span className="text-xs">{getMoodEmoji('stress', moodData.stressLevel)}</span>
            <span className="text-xs">{getMoodEmoji('urgency', moodData.urgencyFeeling)}</span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p className="font-medium">{moodSummary}</p>
          <p className="text-xs">Mood: {moodData.moodScore}/10</p>
          <p className="text-xs">Stress: {moodData.stressLevel}</p>
          <p className="text-xs">Urgency: {moodData.urgencyFeeling}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}