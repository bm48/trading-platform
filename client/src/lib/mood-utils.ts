// Mood visualization utilities for legal cases
export interface MoodData {
  moodScore: number; // 1-10 scale
  stressLevel: 'low' | 'medium' | 'high' | 'critical';
  urgencyFeeling: 'calm' | 'moderate' | 'urgent' | 'panic';
  confidenceLevel: number; // 1-10 scale
  clientSatisfaction: number; // 1-10 scale
  moodNotes?: string;
  lastMoodUpdate?: string;
}

// Emoji mappings for different mood aspects
export const moodEmojis = {
  // Overall mood score (1-10)
  mood: {
    1: '😞', 2: '😔', 3: '😕', 4: '🙁', 5: '😐',
    6: '🙂', 7: '😊', 8: '😄', 9: '😁', 10: '🤩'
  },
  
  // Stress level
  stress: {
    low: '😌',
    medium: '😬',
    high: '😰',
    critical: '🚨'
  },
  
  // Urgency feeling
  urgency: {
    calm: '🧘',
    moderate: '⏰',
    urgent: '🏃',
    panic: '🔥'
  },
  
  // Confidence level (1-10)
  confidence: {
    1: '😨', 2: '😰', 3: '😟', 4: '😔', 5: '😕',
    6: '🙂', 7: '😊', 8: '😎', 9: '💪', 10: '🦾'
  },
  
  // Client satisfaction (1-10)
  satisfaction: {
    1: '😡', 2: '😠', 3: '😤', 4: '😒', 5: '😐',
    6: '🙂', 7: '😊', 8: '😄', 9: '😍', 10: '🥳'
  }
};

export const getMoodEmoji = (type: keyof typeof moodEmojis, value: string | number): string => {
  const emojiMap = moodEmojis[type];
  
  if (typeof value === 'number') {
    return emojiMap[Math.min(10, Math.max(1, Math.round(value))) as keyof typeof emojiMap] || '😐';
  }
  
  return emojiMap[value as keyof typeof emojiMap] || '😐';
};

export const getMoodColor = (moodScore: number): string => {
  if (moodScore <= 3) return 'text-red-500';
  if (moodScore <= 5) return 'text-orange-500';
  if (moodScore <= 7) return 'text-yellow-500';
  return 'text-green-500';
};

export const getStressColor = (stressLevel: string): string => {
  switch (stressLevel) {
    case 'low': return 'text-green-500';
    case 'medium': return 'text-yellow-500';
    case 'high': return 'text-orange-500';
    case 'critical': return 'text-red-500';
    default: return 'text-gray-500';
  }
};

export const getUrgencyColor = (urgencyFeeling: string): string => {
  switch (urgencyFeeling) {
    case 'calm': return 'text-blue-500';
    case 'moderate': return 'text-yellow-500';
    case 'urgent': return 'text-orange-500';
    case 'panic': return 'text-red-500';
    default: return 'text-gray-500';
  }
};

export const getMoodSummary = (moodData: MoodData): string => {
  const { moodScore, stressLevel, urgencyFeeling } = moodData;
  
  if (moodScore <= 3 || stressLevel === 'critical' || urgencyFeeling === 'panic') {
    return 'Case requires immediate attention';
  }
  if (moodScore <= 5 || stressLevel === 'high' || urgencyFeeling === 'urgent') {
    return 'Case needs close monitoring';
  }
  if (moodScore <= 7 || stressLevel === 'medium') {
    return 'Case progressing normally';
  }
  return 'Case going very well';
};

export const getOverallMoodEmoji = (moodData: MoodData): string => {
  const { moodScore, stressLevel, urgencyFeeling } = moodData;
  
  // Weight different factors
  let weightedScore = moodScore;
  
  // Adjust for stress (higher stress = lower overall mood)
  if (stressLevel === 'critical') weightedScore -= 3;
  else if (stressLevel === 'high') weightedScore -= 2;
  else if (stressLevel === 'medium') weightedScore -= 1;
  
  // Adjust for urgency (higher urgency = lower overall mood)
  if (urgencyFeeling === 'panic') weightedScore -= 2;
  else if (urgencyFeeling === 'urgent') weightedScore -= 1;
  
  // Ensure score stays within bounds
  weightedScore = Math.min(10, Math.max(1, Math.round(weightedScore)));
  
  return getMoodEmoji('mood', weightedScore);
};

// Generate mood insights for AI analysis
export const generateMoodInsights = (moodData: MoodData): string[] => {
  const insights: string[] = [];
  
  if (moodData.moodScore <= 3) {
    insights.push('Client appears to be experiencing significant distress');
  }
  
  if (moodData.stressLevel === 'critical' || moodData.stressLevel === 'high') {
    insights.push('High stress levels detected - consider additional support');
  }
  
  if (moodData.urgencyFeeling === 'panic' || moodData.urgencyFeeling === 'urgent') {
    insights.push('Client feels urgent about resolution - prioritize communication');
  }
  
  if (moodData.confidenceLevel <= 3) {
    insights.push('Low confidence in case outcome - provide reassurance');
  }
  
  if (moodData.clientSatisfaction <= 4) {
    insights.push('Client satisfaction below average - review service quality');
  }
  
  if (moodData.moodScore >= 8 && moodData.clientSatisfaction >= 8) {
    insights.push('Excellent client relationship - case proceeding well');
  }
  
  return insights;
};