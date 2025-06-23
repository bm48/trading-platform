import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Target, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Minus,
  TrendingUp,
  Star,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

interface CaseOutcomeTrackerProps {
  caseData: any;
  onOutcomeUpdate?: () => void;
}

export default function CaseOutcomeTracker({ caseData, onOutcomeUpdate }: CaseOutcomeTrackerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  
  const [outcomeData, setOutcomeData] = useState({
    outcome: caseData.outcome || '',
    outcomeDescription: caseData.outcome_description || caseData.outcomeDescription || '',
    amountRecovered: caseData.amount_recovered || caseData.amountRecovered || '',
    amountClaimed: caseData.amount_claimed || caseData.amountClaimed || '',
    resolutionMethod: caseData.resolution_method || caseData.resolutionMethod || '',
    clientSatisfactionScore: caseData.client_satisfaction_score || caseData.clientSatisfactionScore || '',
    strategyEffectiveness: caseData.strategy_effectiveness || caseData.strategyEffectiveness || '',
    wouldRecommend: caseData.would_recommend !== undefined ? caseData.would_recommend : caseData.wouldRecommend,
    lessonsLearned: caseData.lessons_learned || caseData.lessonsLearned || ''
  });

  const updateOutcome = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('PUT', `/api/cases/${caseData.id}/outcome`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cases', caseData.id.toString()] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/overview'] });
      setIsEditing(false);
      toast({
        title: "Case Outcome Updated",
        description: "The case outcome has been successfully recorded.",
      });
      onOutcomeUpdate?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update case outcome.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = {
      ...outcomeData,
      amountRecovered: outcomeData.amountRecovered ? parseFloat(outcomeData.amountRecovered) : undefined,
      amountClaimed: outcomeData.amountClaimed ? parseFloat(outcomeData.amountClaimed) : undefined,
      clientSatisfactionScore: outcomeData.clientSatisfactionScore ? parseInt(outcomeData.clientSatisfactionScore) : undefined,
      strategyEffectiveness: outcomeData.strategyEffectiveness ? parseInt(outcomeData.strategyEffectiveness) : undefined
    };
    
    updateOutcome.mutate(formData);
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'successful':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'partial_success':
        return <Minus className="h-5 w-5 text-yellow-600" />;
      case 'unsuccessful':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'settled':
        return <Target className="h-5 w-5 text-blue-600" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-600" />;
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'successful':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial_success':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unsuccessful':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'settled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateRecoveryRate = () => {
    const recovered = parseFloat(outcomeData.amountRecovered) || 0;
    const claimed = parseFloat(outcomeData.amountClaimed) || 0;
    return claimed > 0 ? ((recovered / claimed) * 100).toFixed(1) : '0';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Case Outcome Tracking
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              {caseData.outcome ? 'Update Outcome' : 'Record Outcome'}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          // Display Mode
          <div className="space-y-6">
            {/* Current Outcome Status */}
            <div>
              <h4 className="font-medium mb-3">Case Status</h4>
              <div className="flex items-center gap-3">
                {getOutcomeIcon(caseData.outcome)}
                <Badge className={getOutcomeColor(caseData.outcome)}>
                  {caseData.outcome ? 
                    caseData.outcome.replace('_', ' ').toUpperCase() : 
                    'ONGOING'
                  }
                </Badge>
                {caseData.resolved_at && (
                  <span className="text-sm text-neutral-medium">
                    Resolved: {formatDate(caseData.resolved_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Financial Metrics */}
            {(caseData.amount_claimed || caseData.amount_recovered) && (
              <div>
                <h4 className="font-medium mb-3">Financial Results</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {caseData.amount_claimed && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-neutral-medium" />
                      <div>
                        <p className="text-sm text-neutral-medium">Amount Claimed</p>
                        <p className="font-semibold">{formatCurrency(caseData.amount_claimed)}</p>
                      </div>
                    </div>
                  )}
                  
                  {caseData.amount_recovered && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm text-neutral-medium">Amount Recovered</p>
                        <p className="font-semibold text-green-600">{formatCurrency(caseData.amount_recovered)}</p>
                      </div>
                    </div>
                  )}
                  
                  {caseData.recovery_percentage && (
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-neutral-medium">Recovery Rate</p>
                        <p className="font-semibold text-blue-600">{caseData.recovery_percentage}%</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resolution Details */}
            {caseData.resolution_method && (
              <div>
                <h4 className="font-medium mb-3">Resolution Method</h4>
                <p className="text-sm text-neutral-dark capitalize">
                  {caseData.resolution_method.replace('_', ' ')}
                </p>
              </div>
            )}

            {/* Satisfaction Metrics */}
            {(caseData.client_satisfaction_score || caseData.strategy_effectiveness) && (
              <div>
                <h4 className="font-medium mb-3">Performance Metrics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {caseData.client_satisfaction_score && (
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <div>
                        <p className="text-sm text-neutral-medium">Client Satisfaction</p>
                        <p className="font-semibold">{caseData.client_satisfaction_score}/10</p>
                      </div>
                    </div>
                  )}
                  
                  {caseData.strategy_effectiveness && (
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-neutral-medium">Strategy Effectiveness</p>
                        <p className="font-semibold">{caseData.strategy_effectiveness}/10</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recommendation */}
            {caseData.would_recommend !== undefined && (
              <div>
                <h4 className="font-medium mb-3">Recommendation</h4>
                <div className="flex items-center gap-2">
                  {caseData.would_recommend ? (
                    <ThumbsUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <ThumbsDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={caseData.would_recommend ? 'text-green-600' : 'text-red-600'}>
                    {caseData.would_recommend ? 'Would recommend' : 'Would not recommend'}
                  </span>
                </div>
              </div>
            )}

            {/* Description and Lessons */}
            {(caseData.outcome_description || caseData.lessons_learned) && (
              <div className="space-y-4">
                {caseData.outcome_description && (
                  <div>
                    <h4 className="font-medium mb-2">Outcome Description</h4>
                    <p className="text-sm text-neutral-dark">{caseData.outcome_description}</p>
                  </div>
                )}
                
                {caseData.lessons_learned && (
                  <div>
                    <h4 className="font-medium mb-2">Lessons Learned</h4>
                    <p className="text-sm text-neutral-dark">{caseData.lessons_learned}</p>
                  </div>
                )}
              </div>
            )}

            {!caseData.outcome && (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                <Target className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-neutral-dark mb-2">No Outcome Recorded</h3>
                <p className="text-neutral-medium mb-4">Record the outcome when your case is resolved.</p>
                <Button onClick={() => setIsEditing(true)}>
                  Record Outcome
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Edit Mode
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Outcome Selection */}
            <div>
              <Label htmlFor="outcome">Case Outcome *</Label>
              <Select 
                value={outcomeData.outcome} 
                onValueChange={(value) => setOutcomeData(prev => ({ ...prev, outcome: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="successful">Successful</SelectItem>
                  <SelectItem value="partial_success">Partial Success</SelectItem>
                  <SelectItem value="unsuccessful">Unsuccessful</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Financial Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amountClaimed">Amount Claimed ($)</Label>
                <Input
                  id="amountClaimed"
                  type="number"
                  step="0.01"
                  value={outcomeData.amountClaimed}
                  onChange={(e) => setOutcomeData(prev => ({ ...prev, amountClaimed: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label htmlFor="amountRecovered">Amount Recovered ($)</Label>
                <Input
                  id="amountRecovered"
                  type="number"
                  step="0.01"
                  value={outcomeData.amountRecovered}
                  onChange={(e) => setOutcomeData(prev => ({ ...prev, amountRecovered: e.target.value }))}
                  placeholder="0.00"
                />
                {outcomeData.amountClaimed && outcomeData.amountRecovered && (
                  <p className="text-sm text-neutral-medium mt-1">
                    Recovery Rate: {calculateRecoveryRate()}%
                  </p>
                )}
              </div>
            </div>

            {/* Resolution Method */}
            <div>
              <Label htmlFor="resolutionMethod">Resolution Method</Label>
              <Select 
                value={outcomeData.resolutionMethod} 
                onValueChange={(value) => setOutcomeData(prev => ({ ...prev, resolutionMethod: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select resolution method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="adjudication">Adjudication</SelectItem>
                  <SelectItem value="litigation">Litigation</SelectItem>
                  <SelectItem value="settlement">Settlement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientSatisfaction">Client Satisfaction (1-10)</Label>
                <Input
                  id="clientSatisfaction"
                  type="number"
                  min="1"
                  max="10"
                  value={outcomeData.clientSatisfactionScore}
                  onChange={(e) => setOutcomeData(prev => ({ ...prev, clientSatisfactionScore: e.target.value }))}
                  placeholder="Rate 1-10"
                />
              </div>
              
              <div>
                <Label htmlFor="strategyEffectiveness">Strategy Effectiveness (1-10)</Label>
                <Input
                  id="strategyEffectiveness"
                  type="number"
                  min="1"
                  max="10"
                  value={outcomeData.strategyEffectiveness}
                  onChange={(e) => setOutcomeData(prev => ({ ...prev, strategyEffectiveness: e.target.value }))}
                  placeholder="Rate 1-10"
                />
              </div>
            </div>

            {/* Recommendation */}
            <div>
              <Label>Would you recommend this approach?</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  type="button"
                  variant={outcomeData.wouldRecommend === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOutcomeData(prev => ({ ...prev, wouldRecommend: true }))}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Yes
                </Button>
                <Button
                  type="button"
                  variant={outcomeData.wouldRecommend === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOutcomeData(prev => ({ ...prev, wouldRecommend: false }))}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  No
                </Button>
              </div>
            </div>

            {/* Outcome Description */}
            <div>
              <Label htmlFor="outcomeDescription">Outcome Description</Label>
              <Textarea
                id="outcomeDescription"
                value={outcomeData.outcomeDescription}
                onChange={(e) => setOutcomeData(prev => ({ ...prev, outcomeDescription: e.target.value }))}
                placeholder="Describe the outcome and how it was achieved..."
                rows={3}
              />
            </div>

            {/* Lessons Learned */}
            <div>
              <Label htmlFor="lessonsLearned">Lessons Learned</Label>
              <Textarea
                id="lessonsLearned"
                value={outcomeData.lessonsLearned}
                onChange={(e) => setOutcomeData(prev => ({ ...prev, lessonsLearned: e.target.value }))}
                placeholder="What did you learn from this case that could help with future cases?"
                rows={3}
              />
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={updateOutcome.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!outcomeData.outcome || updateOutcome.isPending}
              >
                {updateOutcome.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Outcome'
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}