import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, AlertCircle } from 'lucide-react';

interface EvaluationParameter {
  id: string;
  name: string;
  description: string | null;
  max_score: number;
}

interface Application {
  id: string;
  user_id: string;
  current_round: number | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
  jobs?: {
    title: string;
    total_rounds: number | null;
  } | null;
}

interface EvaluateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  onEvaluationComplete: () => void;
}

interface ScoreEntry {
  parameterId: string;
  score: number;
  remarks: string;
}

export function EvaluateDialog({ 
  open, 
  onOpenChange, 
  application,
  onEvaluationComplete 
}: EvaluateDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [parameters, setParameters] = useState<EvaluationParameter[]>([]);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [recommendation, setRecommendation] = useState<'pass' | 'fail' | 'hold'>('hold');
  const [overallRemarks, setOverallRemarks] = useState('');
  const [isVisibleToCandidate, setIsVisibleToCandidate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingEvaluation, setExistingEvaluation] = useState<any>(null);

  useEffect(() => {
    if (open && application) {
      fetchParameters();
      checkExistingEvaluation();
    }
  }, [open, application]);

  const fetchParameters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('evaluation_parameters')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      const params = data || [];
      setParameters(params);
      
      // Initialize scores with default values
      setScores(params.map(p => ({
        parameterId: p.id,
        score: Math.floor(p.max_score / 2),
        remarks: ''
      })));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load evaluation parameters',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkExistingEvaluation = async () => {
    if (!application) return;
    
    try {
      const { data, error } = await supabase
        .from('candidate_evaluations')
        .select(`
          *,
          evaluation_scores (*)
        `)
        .eq('application_id', application.id)
        .eq('round_number', application.current_round || 1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingEvaluation(data);
        setRecommendation(data.recommendation as 'pass' | 'fail' | 'hold');
        setOverallRemarks(data.overall_remarks || '');
        setIsVisibleToCandidate(data.is_visible_to_candidate);
        
        // Load existing scores
        if (data.evaluation_scores && data.evaluation_scores.length > 0) {
          setScores(data.evaluation_scores.map((s: any) => ({
            parameterId: s.parameter_id,
            score: s.score,
            remarks: s.remarks || ''
          })));
        }
      } else {
        setExistingEvaluation(null);
        setRecommendation('hold');
        setOverallRemarks('');
        setIsVisibleToCandidate(false);
      }
    } catch (error) {
      console.error('Error checking existing evaluation:', error);
    }
  };

  const handleScoreChange = (parameterId: string, score: number) => {
    setScores(prev => prev.map(s => 
      s.parameterId === parameterId ? { ...s, score } : s
    ));
  };

  const handleRemarksChange = (parameterId: string, remarks: string) => {
    setScores(prev => prev.map(s => 
      s.parameterId === parameterId ? { ...s, remarks } : s
    ));
  };

  const handleSubmit = async () => {
    if (!application || !user) return;
    
    setSubmitting(true);
    try {
      // Create or update the evaluation
      let evaluationId: string;
      
      if (existingEvaluation) {
        // Update existing
        const { error } = await supabase
          .from('candidate_evaluations')
          .update({
            recommendation,
            overall_remarks: overallRemarks || null,
            is_visible_to_candidate: isVisibleToCandidate,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEvaluation.id);

        if (error) throw error;
        evaluationId = existingEvaluation.id;

        // Delete existing scores and re-insert
        await supabase
          .from('evaluation_scores')
          .delete()
          .eq('evaluation_id', evaluationId);
      } else {
        // Create new
        const { data, error } = await supabase
          .from('candidate_evaluations')
          .insert({
            application_id: application.id,
            round_number: application.current_round || 1,
            evaluator_id: user.id,
            recommendation,
            overall_remarks: overallRemarks || null,
            is_visible_to_candidate: isVisibleToCandidate
          })
          .select('id')
          .single();

        if (error) throw error;
        evaluationId = data.id;
      }

      // Insert scores
      const scoreInserts = scores.map(s => ({
        evaluation_id: evaluationId,
        parameter_id: s.parameterId,
        score: s.score,
        remarks: s.remarks || null
      }));

      const { error: scoresError } = await supabase
        .from('evaluation_scores')
        .insert(scoreInserts);

      if (scoresError) throw scoresError;

      // If recommendation is pass, update application status
      if (recommendation === 'pass') {
        const totalRounds = application.jobs?.total_rounds || 1;
        const currentRound = application.current_round || 1;

        if (currentRound >= totalRounds) {
          // Final round - mark as selected
          await supabase
            .from('applications')
            .update({ status: 'selected' })
            .eq('id', application.id);
        } else {
          // Move to next round
          await supabase
            .from('applications')
            .update({ 
              current_round: currentRound + 1,
              status: 'passed',
              test_enabled: false
            })
            .eq('id', application.id);
        }
      } else if (recommendation === 'fail') {
        await supabase
          .from('applications')
          .update({ status: 'rejected' })
          .eq('id', application.id);
      }

      toast({
        title: 'Success',
        description: existingEvaluation 
          ? 'Evaluation updated successfully' 
          : 'Evaluation submitted successfully'
      });

      onOpenChange(false);
      onEvaluationComplete();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getTotalScore = () => {
    return scores.reduce((sum, s) => sum + s.score, 0);
  };

  const getMaxTotalScore = () => {
    return parameters.reduce((sum, p) => sum + p.max_score, 0);
  };

  const getScorePercentage = () => {
    const max = getMaxTotalScore();
    return max > 0 ? Math.round((getTotalScore() / max) * 100) : 0;
  };

  if (!application) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            Evaluate Candidate
          </DialogTitle>
          <DialogDescription>
            {application.profiles?.full_name || 'Candidate'} • {application.jobs?.title} • Round {application.current_round || 1}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : parameters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
            <p>No evaluation parameters configured.</p>
            <p className="text-sm">Please add parameters in Evaluation Settings first.</p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {existingEvaluation && (
              <div className="bg-muted/50 p-3 rounded-lg border">
                <p className="text-sm text-muted-foreground">
                  ℹ️ This candidate was previously evaluated for this round. You can update the evaluation.
                </p>
              </div>
            )}

            {/* Score Summary */}
            <div className="bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Score</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">
                    {getTotalScore()}
                  </span>
                  <span className="text-muted-foreground">/ {getMaxTotalScore()}</span>
                  <Badge variant={getScorePercentage() >= 70 ? 'default' : getScorePercentage() >= 50 ? 'secondary' : 'destructive'}>
                    {getScorePercentage()}%
                  </Badge>
                </div>
              </div>
            </div>

            {/* Parameter Scores */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Parameter Scores
              </h4>
              {parameters.map(param => {
                const scoreEntry = scores.find(s => s.parameterId === param.id);
                const currentScore = scoreEntry?.score || 0;
                
                return (
                  <div key={param.id} className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">{param.name}</Label>
                        {param.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {param.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-lg font-semibold">
                        {currentScore} / {param.max_score}
                      </Badge>
                    </div>
                    
                    <Slider
                      value={[currentScore]}
                      max={param.max_score}
                      step={1}
                      onValueChange={([value]) => handleScoreChange(param.id, value)}
                      className="mt-2"
                    />
                    
                    <Textarea
                      placeholder={`Remarks for ${param.name} (optional)`}
                      value={scoreEntry?.remarks || ''}
                      onChange={(e) => handleRemarksChange(param.id, e.target.value)}
                      rows={2}
                      className="mt-2"
                    />
                  </div>
                );
              })}
            </div>

            {/* Overall Remarks */}
            <div className="space-y-2">
              <Label>Overall Remarks</Label>
              <Textarea
                placeholder="Summary of candidate's performance, strengths, areas for improvement..."
                value={overallRemarks}
                onChange={(e) => setOverallRemarks(e.target.value)}
                rows={3}
              />
            </div>

            {/* Recommendation */}
            <div className="space-y-3">
              <Label>Recommendation</Label>
              <RadioGroup 
                value={recommendation} 
                onValueChange={(v) => setRecommendation(v as 'pass' | 'fail' | 'hold')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pass" id="pass" />
                  <Label htmlFor="pass" className="cursor-pointer text-success font-medium">
                    Pass (Move to Next Round)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hold" id="hold" />
                  <Label htmlFor="hold" className="cursor-pointer text-warning font-medium">
                    Hold (Keep on Waitlist)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fail" id="fail" />
                  <Label htmlFor="fail" className="cursor-pointer text-destructive font-medium">
                    Fail (Reject)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div>
                <Label>Show Evaluation to Candidate</Label>
                <p className="text-xs text-muted-foreground">
                  Allow the candidate to view this evaluation feedback
                </p>
              </div>
              <Switch
                checked={isVisibleToCandidate}
                onCheckedChange={setIsVisibleToCandidate}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || loading || parameters.length === 0}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingEvaluation ? 'Update Evaluation' : 'Submit Evaluation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
