import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  Eye
} from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  marks: number | null;
}

interface Answer {
  question_id: string;
  selected_answer: string | null;
}

interface Application {
  id: string;
  current_round: number;
  test_enabled: boolean;
  job_id: string;
  jobs: {
    title: string;
    total_rounds: number | null;
  };
}

export default function Test() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testAttemptId, setTestAttemptId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes default
  const [violationCount, setViolationCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [testResult, setTestResult] = useState<{ passed: boolean; score: number; total: number } | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize test
  useEffect(() => {
    if (user) {
      initializeTest();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [applicationId, user]);

  // Timer countdown
  useEffect(() => {
    if (testAttemptId && !testCompleted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [testAttemptId, testCompleted]);

  // Violation detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && testAttemptId && !testCompleted) {
        handleViolation('tab_switch');
      }
    };

    const handleBlur = () => {
      if (testAttemptId && !testCompleted) {
        handleViolation('window_blur');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [testAttemptId, testCompleted]);

  const initializeTest = async () => {
    try {
      // Fetch application
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('id, current_round, test_enabled, job_id, jobs (title, total_rounds)')
        .eq('id', applicationId)
        .eq('user_id', user!.id)
        .single();

      if (appError) throw appError;
      
      if (!appData.test_enabled) {
        toast({
          title: 'Test Not Available',
          description: 'Your test has not been enabled yet. Please wait for admin approval.',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }

      setApplication(appData as unknown as Application);

      // Check for existing test attempt
      const { data: existingAttempt } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('application_id', applicationId)
        .eq('round_number', appData.current_round)
        .eq('user_id', user!.id)
        .single();

      if (existingAttempt) {
        if (existingAttempt.is_submitted) {
          setTestCompleted(true);
          setTestResult({
            passed: existingAttempt.is_passed || false,
            score: existingAttempt.obtained_marks || 0,
            total: existingAttempt.total_marks || 0,
          });
          setLoading(false);
          return;
        }
        
        // Resume existing attempt
        setTestAttemptId(existingAttempt.id);
        const elapsed = Math.floor(
          (Date.now() - new Date(existingAttempt.started_at!).getTime()) / 1000
        );
        const remaining = (existingAttempt.duration_minutes || 60) * 60 - elapsed;
        setTimeLeft(Math.max(0, remaining));

        // Load existing answers
        const { data: existingAnswers } = await supabase
          .from('answers')
          .select('question_id, selected_answer')
          .eq('test_attempt_id', existingAttempt.id);

        if (existingAnswers) {
          const answersMap: Record<string, string> = {};
          existingAnswers.forEach(a => {
            if (a.selected_answer) answersMap[a.question_id] = a.selected_answer;
          });
          setAnswers(answersMap);
        }
      } else {
        // Create new test attempt
        const { data: newAttempt, error: attemptError } = await supabase
          .from('test_attempts')
          .insert({
            application_id: applicationId!,
            user_id: user!.id,
            round_number: appData.current_round,
            started_at: new Date().toISOString(),
            duration_minutes: 60,
          })
          .select('id')
          .single();

        if (attemptError) throw attemptError;
        setTestAttemptId(newAttempt.id);
      }

      // Fetch questions for this job and round
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, option_a, option_b, option_c, option_d, marks')
        .eq('job_id', appData.job_id)
        .eq('round_number', appData.current_round);

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

    } catch (err) {
      console.error('Error initializing test:', err);
      toast({
        title: 'Error',
        description: 'Failed to load test. Please try again.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleViolation = async (type: string) => {
    const newCount = violationCount + 1;
    setViolationCount(newCount);
    setShowWarning(true);

    if (testAttemptId) {
      await supabase.from('violations').insert({
        test_attempt_id: testAttemptId,
        user_id: user!.id,
        violation_type: type,
        violation_count: newCount,
      });
    }

    if (newCount >= 3) {
      handleAutoSubmit();
    }
  };

  const handleAnswerChange = async (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));

    if (testAttemptId) {
      // Upsert answer
      const { data: existing } = await supabase
        .from('answers')
        .select('id')
        .eq('test_attempt_id', testAttemptId)
        .eq('question_id', questionId)
        .single();

      if (existing) {
        await supabase
          .from('answers')
          .update({ selected_answer: answer })
          .eq('id', existing.id);
      } else {
        await supabase.from('answers').insert({
          test_attempt_id: testAttemptId,
          question_id: questionId,
          selected_answer: answer,
        });
      }
    }
  };

  const handleAutoSubmit = useCallback(async () => {
    await submitTest(true);
  }, [testAttemptId, answers]);

  const submitTest = async (autoSubmit = false) => {
    if (!testAttemptId) return;
    
    setSubmitting(true);
    try {
      // Calculate score
      const { data: questionsWithAnswers } = await supabase
        .from('questions')
        .select('id, correct_answer, marks')
        .eq('job_id', application!.job_id)
        .eq('round_number', application!.current_round);

      let totalMarks = 0;
      let obtainedMarks = 0;

      if (questionsWithAnswers) {
        for (const q of questionsWithAnswers) {
          totalMarks += q.marks || 1;
          if (answers[q.id] === q.correct_answer) {
            obtainedMarks += q.marks || 1;
          }
        }
      }

      // Update answers with is_correct
      if (questionsWithAnswers) {
        for (const q of questionsWithAnswers) {
          await supabase
            .from('answers')
            .update({ is_correct: answers[q.id] === q.correct_answer })
            .eq('test_attempt_id', testAttemptId)
            .eq('question_id', q.id);
        }
      }

      const passingMarks = Math.ceil(totalMarks * 0.6); // 60% passing
      const isPassed = obtainedMarks >= passingMarks;

      // Update test attempt
      await supabase
        .from('test_attempts')
        .update({
          is_submitted: true,
          ended_at: new Date().toISOString(),
          total_marks: totalMarks,
          obtained_marks: obtainedMarks,
          passing_marks: passingMarks,
          is_passed: isPassed,
          auto_submitted: autoSubmit,
        })
        .eq('id', testAttemptId);

      // Update application status
      const newStatus = isPassed ? 'passed' : 'failed';
      await supabase
        .from('applications')
        .update({
          status: newStatus,
          test_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      setTestCompleted(true);
      setTestResult({
        passed: isPassed,
        score: obtainedMarks,
        total: totalMarks,
      });

      toast({
        title: autoSubmit ? 'Test Auto-Submitted' : 'Test Submitted',
        description: isPassed 
          ? 'Congratulations! You passed the test.' 
          : 'Unfortunately, you did not pass.',
      });
    } catch (err) {
      console.error('Error submitting test:', err);
      toast({
        title: 'Submission Failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setShowConfirmSubmit(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading test...</p>
        </div>
      </div>
    );
  }

  if (testCompleted && testResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className={`h-16 w-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
              testResult.passed ? 'bg-success/20' : 'bg-destructive/20'
            }`}>
              {testResult.passed ? (
                <CheckCircle2 className="h-8 w-8 text-success" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-destructive" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {testResult.passed ? 'Congratulations!' : 'Test Completed'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-4xl font-bold mb-2">
              {testResult.score} / {testResult.total}
            </p>
            <p className="text-muted-foreground mb-6">
              {testResult.passed 
                ? 'You have passed the test! Wait for further updates.'
                : 'Unfortunately, you did not meet the passing criteria.'}
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="container flex items-center justify-between py-4">
          <div>
            <h1 className="font-display font-bold">{application?.jobs.title}</h1>
            <p className="text-sm text-muted-foreground">
              Round {application?.current_round} of {application?.jobs.total_rounds || 1}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold ${
              timeLeft <= 300 ? 'bg-destructive/10 text-destructive' : 'bg-muted'
            }`}>
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="container py-4">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span>Progress: {answeredCount} of {questions.length} answered</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <main className="container py-6">
        {questions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-2">No Questions Available</h3>
              <p className="text-muted-foreground mb-4">
                Questions for this test have not been added yet.
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : currentQuestion ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="text-sm font-medium">
                  {currentQuestion.marks || 1} mark{(currentQuestion.marks || 1) > 1 ? 's' : ''}
                </span>
              </div>
              <CardTitle className="text-xl leading-relaxed">
                {currentQuestion.question_text}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                <div className="space-y-3">
                  {['A', 'B', 'C', 'D'].map((option) => {
                    const optionKey = `option_${option.toLowerCase()}` as keyof Question;
                    const optionText = currentQuestion[optionKey];
                    if (!optionText) return null;
                    
                    return (
                      <div
                        key={option}
                        className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                          answers[currentQuestion.id] === option
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => handleAnswerChange(currentQuestion.id, option)}
                      >
                        <RadioGroupItem value={option} id={`option-${option}`} />
                        <Label 
                          htmlFor={`option-${option}`} 
                          className="flex-1 cursor-pointer font-normal"
                        >
                          <span className="font-semibold mr-2">{option}.</span>
                          {optionText as string}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        ) : null}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-8 w-8 rounded-full text-sm font-medium transition-colors ${
                  idx === currentIndex
                    ? 'bg-primary text-primary-foreground'
                    : answers[questions[idx].id]
                    ? 'bg-success/20 text-success'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {currentIndex === questions.length - 1 ? (
            <Button onClick={() => setShowConfirmSubmit(true)} variant="hero">
              <Send className="h-4 w-4 mr-2" />
              Submit Test
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Question Navigator */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Question Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-10 w-10 rounded-lg text-sm font-medium transition-colors ${
                    idx === currentIndex
                      ? 'bg-primary text-primary-foreground'
                      : answers[q.id]
                      ? 'bg-success/20 text-success border border-success/50'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-success/20 border border-success/50" />
                Answered
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-muted" />
                Not Answered
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-primary" />
                Current
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Warning Dialog */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Warning: Tab Switch Detected
            </DialogTitle>
            <DialogDescription>
              You have switched tabs or left the test window. This is recorded as a violation.
              <br /><br />
              <strong>Violations: {violationCount} of 3</strong>
              <br />
              After 3 violations, your test will be automatically submitted.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowWarning(false)}>
            I Understand
          </Button>
        </DialogContent>
      </Dialog>

      {/* Confirm Submit Dialog */}
      <Dialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Test?</DialogTitle>
            <DialogDescription>
              You have answered {answeredCount} out of {questions.length} questions.
              <br /><br />
              {answeredCount < questions.length && (
                <span className="text-destructive">
                  Warning: You have {questions.length - answeredCount} unanswered question(s).
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowConfirmSubmit(false)} className="flex-1">
              Review Answers
            </Button>
            <Button 
              onClick={() => submitTest(false)} 
              disabled={submitting}
              className="flex-1"
              variant="hero"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Submit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
