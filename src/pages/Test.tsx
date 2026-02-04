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
  Maximize,
  Shield,
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

interface Application {
  id: string;
  current_round: number;
  test_enabled: boolean;
  job_id: string;
  jobs: {
    title: string;
    total_rounds: number | null;
    question_count: number | null;
    test_time_minutes: number | null;
  };
}

interface JobRound {
  round_number: number;
  name: string;
  description: string | null;
}

// Shuffle array using Fisher-Yates algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function Test() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testAttemptId, setTestAttemptId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // Default 15 minutes, will be updated from job settings
  const [violationCount, setViolationCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [testResult, setTestResult] = useState<{ passed: boolean; score: number; total: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true);
  const [testStarted, setTestStarted] = useState(false);
  const [currentRoundInfo, setCurrentRoundInfo] = useState<JobRound | null>(null);
  const [proctorReady, setProctorReady] = useState(false); // Delay proctoring until stable
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const submitTestRef = useRef<((autoSubmit: boolean) => Promise<void>) | null>(null);
  const violationProcessingRef = useRef<boolean>(false);
  const lastBlurTimeRef = useRef<number>(0); // Track blur events to debounce

  // Initialize test
  useEffect(() => {
    if (user) {
      initializeTest();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [applicationId, user]);

  // Timer countdown - only start when test is started
  useEffect(() => {
    if (testAttemptId && !testCompleted && timeLeft > 0 && testStarted) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [testAttemptId, testCompleted, testStarted]);

  // Auto-submit when time reaches 0
  useEffect(() => {
    if (timeLeft === 0 && testAttemptId && !testCompleted && testStarted && submitTestRef.current) {
      submitTestRef.current(true);
    }
  }, [timeLeft, testAttemptId, testCompleted, testStarted]);

  // Fullscreen change detection - prevent exit until test is submitted
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      
      // If user exits fullscreen during test, force back to fullscreen and count as violation
      // But allow exit if test is completed
      // Only count violation if proctoring is ready (prevents false positives during setup)
      if (!isNowFullscreen && testStarted && testAttemptId && !testCompleted && proctorReady) {
        // Immediately try to re-enter fullscreen
        document.documentElement.requestFullscreen().catch(() => {
          // If request fails, still count violation
        });
        triggerViolation('fullscreen_exit', 'You exited fullscreen mode. Please stay in fullscreen during the test.');
      }
      
      // If test is completed, ensure we exit fullscreen
      if (testCompleted && isNowFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // Also listen for fullscreen exit attempts and prevent them
    const handleFullscreenError = () => {
      if (testStarted && testAttemptId && !testCompleted && proctorReady && !document.fullscreenElement) {
        // Try to re-enter fullscreen
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    
    // Monitor fullscreen state periodically (only during active test)
    const fullscreenCheck = setInterval(() => {
      if (testCompleted) {
        // Test is completed, exit fullscreen if still in it
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } else if (testStarted && testAttemptId && !testCompleted && proctorReady && !document.fullscreenElement) {
        // Test is active and proctoring ready, force fullscreen
        document.documentElement.requestFullscreen().catch(() => {
          triggerViolation('fullscreen_exit', 'Fullscreen mode is required. Please stay in fullscreen during the test.');
        });
      }
    }, 1000);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      clearInterval(fullscreenCheck);
    };
  }, [testStarted, testAttemptId, testCompleted, proctorReady]);

  // Violation detection - only when test is started AND proctoring is ready
  useEffect(() => {
    if (!testStarted || !proctorReady) return;
    
    const handleVisibilityChange = () => {
      // Only trigger if proctoring is ready and test conditions are met
      if (document.hidden && testAttemptId && !testCompleted && testStarted && proctorReady) {
        triggerViolation('tab_switch', 'You switched to another tab. This is a violation.');
      }
    };

    const handleBlur = () => {
      // Debounce blur events - ignore if happened within 1 second of last blur
      const now = Date.now();
      if (now - lastBlurTimeRef.current < 1000) {
        return; // Ignore rapid successive blur events
      }
      lastBlurTimeRef.current = now;
      
      // Only trigger if proctoring is ready and we're in fullscreen
      // The blur event can fire during fullscreen transitions, so we check fullscreen state
      if (testAttemptId && !testCompleted && testStarted && proctorReady && document.fullscreenElement) {
        triggerViolation('window_blur', 'You clicked outside the test window. Please stay focused on the test.');
      }
    };

    // Prevent copy-paste (only after fullscreen/test started)
    const handleCopy = (e: ClipboardEvent) => {
      if (testAttemptId && !testCompleted && testStarted) {
        e.preventDefault();
        triggerViolation('copy_paste', 'Copy-paste is not allowed during the test.');
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (testAttemptId && !testCompleted && testStarted) {
        e.preventDefault();
        triggerViolation('copy_paste', 'Pasting is not allowed during the test.');
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      if (testAttemptId && !testCompleted && testStarted) {
        e.preventDefault();
        triggerViolation('copy_paste', 'Cut is not allowed during the test.');
      }
    };

    // Prevent right-click context menu (only after fullscreen/test started)
    const handleContextMenu = (e: MouseEvent) => {
      if (testAttemptId && !testCompleted && testStarted) {
        e.preventDefault();
      }
    };

    // Block all keyboard keys except allowed ones for test navigation
    // Keyboard is disabled after user enters fullscreen (testStarted = true)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (testAttemptId && !testCompleted && testStarted) {
        const target = e.target as HTMLElement;
        const isButton = target.tagName === 'BUTTON';
        const isRadioInput = target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'radio';
        
        // Block all function keys (F1-F12) - these can open dev tools, refresh, etc.
        if (e.key.startsWith('F') && /^F\d+$/.test(e.key)) {
          e.preventDefault();
          triggerViolation('keyboard_restricted', `Pressing ${e.key} is not allowed during the test.`);
          return;
        }
        
        // Block all Ctrl/Cmd/Alt combinations (shortcuts)
        if (e.ctrlKey || e.metaKey || e.altKey) {
          e.preventDefault();
          triggerViolation('keyboard_shortcut', 'Keyboard shortcuts are not allowed during the test.');
          return;
        }
        
        // Block Escape key (prevents exiting fullscreen)
        if (e.key === 'Escape') {
          e.preventDefault();
          triggerViolation('keyboard_restricted', 'Exiting fullscreen is not allowed. Please complete the test.');
          return;
        }
        
        // Block Tab key (prevents tabbing out of test)
        if (e.key === 'Tab') {
          e.preventDefault();
          triggerViolation('keyboard_restricted', 'Tab key is not allowed during the test.');
          return;
        }
        
        // Allow only specific keys for test navigation
        const allowedNavigationKeys = [
          'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', // Navigate between questions/options
          'Enter', 'Space', // Select option
        ];
        
        // Allow number keys 1-4 for quick option selection (A, B, C, D)
        const isNumberKey = /^[1-4]$/.test(e.key);
        
        // Handle number key selection (1=A, 2=B, 3=C, 4=D)
        if (isNumberKey && questions.length > 0 && currentIndex < questions.length) {
          const currentQuestion = questions[currentIndex];
          if (currentQuestion) {
            const optionMap: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
            const selectedOption = optionMap[e.key];
            if (selectedOption) {
              // Check if this option exists for current question
              const optionKey = `option_${selectedOption.toLowerCase()}` as keyof Question;
              if (currentQuestion[optionKey]) {
                e.preventDefault();
                handleAnswerChange(currentQuestion.id, selectedOption);
                return; // Allow this key
              }
            }
          }
        }
        
        // Handle arrow key navigation between questions
        if (e.key === 'ArrowLeft' && !isButton && !isRadioInput) {
          e.preventDefault();
          setCurrentIndex(prev => Math.max(0, prev - 1));
          return; // Allow this key
        }
        
        if (e.key === 'ArrowRight' && !isButton && !isRadioInput) {
          e.preventDefault();
          setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1));
          return; // Allow this key
        }
        
        // Allow keys when clicking buttons (Previous, Next, Submit)
        if (isButton) {
          // Allow Enter and Space on buttons
          if (e.key === 'Enter' || e.key === 'Space') {
            return; // Allow button activation
          }
          // Block all other keys on buttons
          e.preventDefault();
          triggerViolation('keyboard_restricted', `Only Enter and Space are allowed on buttons.`);
          return;
        }
        
        // For radio inputs, allow arrow keys, space, enter, and numbers
        if (isRadioInput) {
          if (allowedNavigationKeys.includes(e.key) || isNumberKey) {
            return; // Allow radio button navigation
          }
          e.preventDefault();
          triggerViolation('keyboard_restricted', `Only arrow keys, space, enter, and numbers 1-4 are allowed for selecting answers.`);
          return;
        }
        
        // For all other cases, only allow specific navigation keys
        if (!allowedNavigationKeys.includes(e.key) && !isNumberKey) {
          // Block all other keys
          e.preventDefault();
          triggerViolation('keyboard_restricted', `Pressing "${e.key}" is not allowed. Only arrow keys, space, enter, and numbers 1-4 are permitted.`);
          return;
        }
      }
    };

    // Prevent page unload/close (only after fullscreen/test started)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (testAttemptId && !testCompleted && testStarted) {
        e.preventDefault();
        e.returnValue = 'You cannot close the window during the test. Please complete the test first.';
        triggerViolation('window_close_attempt', 'Attempted to close the window during the test.');
        return e.returnValue;
      }
    };

    // Prevent page refresh (only after fullscreen/test started)
    const handleKeyDownRefresh = (e: KeyboardEvent) => {
      if (testAttemptId && !testCompleted && testStarted) {
        // Block F5 (refresh) and Ctrl+R / Cmd+R
        if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) {
          e.preventDefault();
          triggerViolation('refresh_attempt', 'Refreshing the page is not allowed during the test.');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('keydown', handleKeyDownRefresh);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('keydown', handleKeyDownRefresh);
    };
  }, [testStarted, testAttemptId, testCompleted, questions, currentIndex, proctorReady]);

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setShowFullscreenPrompt(false);
      setTestStarted(true);
      
      // Delay proctoring activation to allow UI to stabilize
      // This prevents false positive violations during the initial fullscreen transition
      setTimeout(() => {
        setProctorReady(true);
      }, 2000); // 2 second grace period after entering fullscreen
    } catch (err) {
      toast({
        title: 'Fullscreen Required',
        description: 'Please allow fullscreen to start the test.',
        variant: 'destructive',
      });
    }
  };

  const initializeTest = async () => {
    try {
      // Fetch application
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('id, current_round, test_enabled, job_id, jobs (title, total_rounds, question_count, test_time_minutes)')
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

      // Fetch current round information
      const { data: roundData } = await supabase
        .from('job_rounds')
        .select('round_number, name, description')
        .eq('job_id', appData.job_id)
        .eq('round_number', appData.current_round)
        .single();

      if (roundData) {
        setCurrentRoundInfo(roundData);
      }

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
          setShowFullscreenPrompt(false);
          setLoading(false);
          return;
        }
        
        // Resume existing attempt
        setTestAttemptId(existingAttempt.id);
        const elapsed = Math.floor(
          (Date.now() - new Date(existingAttempt.started_at!).getTime()) / 1000
        );
        // Use the duration from the test attempt (which was set from job's test_time_minutes)
        const remaining = (existingAttempt.duration_minutes || 15) * 60 - elapsed;
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

        // Fetch existing violation count for this test attempt
        const { data: existingViolations } = await supabase
          .from('violations')
          .select('violation_count')
          .eq('test_attempt_id', existingAttempt.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (existingViolations && existingViolations.length > 0) {
          const currentCount = existingViolations[0].violation_count || 0;
          setViolationCount(currentCount);
          // If already at 2 violations, we'll need to auto-submit after questions are loaded
          // This will be handled in the triggerViolation function
        }
      } else {
        // Create new test attempt
        const testDuration = (appData as unknown as Application).jobs?.test_time_minutes || 15;
        const { data: newAttempt, error: attemptError } = await supabase
          .from('test_attempts')
          .insert({
            application_id: applicationId!,
            user_id: user!.id,
            round_number: appData.current_round,
            started_at: new Date().toISOString(),
            duration_minutes: testDuration,
          })
          .select('id')
          .single();

        if (attemptError) throw attemptError;
        setTestAttemptId(newAttempt.id);
        setTimeLeft(testDuration * 60); // Set initial time in seconds
      }

      // Fetch questions for this job and round
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, option_a, option_b, option_c, option_d, marks')
        .eq('job_id', appData.job_id)
        .eq('round_number', appData.current_round);

      if (questionsError) throw questionsError;
      
      // Shuffle questions randomly and limit to question_count set by admin
      const shuffledQuestions = shuffleArray(questionsData || []);
      const questionLimit = (appData as unknown as Application).jobs?.question_count || 10;
      const limitedQuestions = shuffledQuestions.slice(0, questionLimit);
      setQuestions(limitedQuestions);

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

  const triggerViolation = async (type: string, message: string) => {
    // Don't allow violations if test is completed or already processing
    if (testCompleted || !testAttemptId || violationProcessingRef.current) {
      return;
    }

    // Prevent multiple simultaneous violation triggers
    violationProcessingRef.current = true;

    try {
      // Fetch current violation count from database to ensure accuracy
      // This prevents race conditions and ensures we have the correct count
      const { data: existingViolations } = await supabase
        .from('violations')
        .select('violation_count')
        .eq('test_attempt_id', testAttemptId)
        .order('created_at', { ascending: false })
        .limit(1);

      const currentDbCount = existingViolations && existingViolations.length > 0 
        ? (existingViolations[0].violation_count || 0) 
        : violationCount;

      // If already at 2 violations in database, don't allow more and auto-submit
      if (currentDbCount >= 2) {
        setViolationCount(2);
        // Auto-submit immediately if questions are loaded
        if (questions.length > 0) {
          submitTest(true);
        }
        return;
      }

      // Calculate new count
      const newCount = currentDbCount + 1;
      
      // Update local state
      setViolationCount(newCount);
      setWarningMessage(message);
      setShowWarning(true);

      // Insert violation record with the new count
      await supabase.from('violations').insert({
        test_attempt_id: testAttemptId,
        user_id: user!.id,
        violation_type: type,
        violation_count: newCount,
      });

      // If reached 2 violations, auto-submit immediately
      if (newCount >= 2) {
        // Auto-submit the test immediately after 2nd violation
        // Use submitTest directly to ensure it works
        if (questions.length > 0) {
          // Questions are loaded, submit immediately
          submitTest(true);
        } else {
          // Questions not loaded yet, wait a bit and try again
          setTimeout(() => {
            if (questions.length > 0) {
              submitTest(true);
            }
          }, 1000);
        }
      }
    } finally {
      // Reset processing flag after a short delay to prevent rapid-fire violations
      setTimeout(() => {
        violationProcessingRef.current = false;
      }, 500);
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

  const submitTest = async (autoSubmit = false) => {
    if (!testAttemptId) return;
    
    // Exit fullscreen when submitting
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    
    setSubmitting(true);
    try {
      // Calculate score - only for questions that were displayed to the user
      const displayedQuestionIds = questions.map(q => q.id);
      
      const { data: questionsWithAnswers } = await supabase
        .from('questions')
        .select('id, correct_answer, marks')
        .in('id', displayedQuestionIds);

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

      // Update application status and move to next round if passed
      if (isPassed && application) {
        const totalRounds = application.jobs?.total_rounds || 1;
        const currentRound = application.current_round || 1;

        if (currentRound >= totalRounds) {
          // Final round - mark as selected
          await supabase
            .from('applications')
            .update({ 
              status: 'selected',
              test_enabled: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', applicationId);
        } else {
          // Move to next round
          await supabase
            .from('applications')
            .update({ 
              current_round: currentRound + 1,
              status: 'passed',
              test_enabled: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', applicationId);
        }
      } else {
        // Failed the test
        await supabase
          .from('applications')
          .update({
            status: 'failed',
            test_enabled: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', applicationId);
      }

      setTestCompleted(true);
      setTestResult({
        passed: isPassed,
        score: obtainedMarks,
        total: totalMarks,
      });

      // Ensure fullscreen is exited after test completion
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

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

  // Store submitTest in ref for auto-submit when timer reaches 0
  useEffect(() => {
    submitTestRef.current = submitTest;
  }, [testAttemptId, questions, answers]);

  // Exit fullscreen when test is completed
  useEffect(() => {
    if (testCompleted && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, [testCompleted]);

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

  // Fullscreen prompt before test starts
  if (showFullscreenPrompt && !testCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Proctored Test Environment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-muted-foreground space-y-3">
              <p className="font-medium text-foreground">Before you begin, please note:</p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>Test will run in <strong>fullscreen mode</strong></li>
                <li>Switching tabs or windows is <strong>not allowed</strong></li>
                <li>Copy-paste and keyboard shortcuts are <strong>disabled</strong></li>
                <li><strong>2 violations</strong> will auto-submit your test</li>
                <li>Timer starts once you enter fullscreen</li>
                <li>Questions are randomly shuffled</li>
              </ul>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium">Job: {application?.jobs.title}</p>
              <p className="text-sm text-muted-foreground">
                {currentRoundInfo?.name || `Round ${application?.current_round}`} of {application?.jobs.total_rounds || 1}
              </p>
              {currentRoundInfo?.description && (
                <p className="text-xs text-muted-foreground mt-1">{currentRoundInfo.description}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Duration: {application?.jobs?.test_time_minutes || 15} minutes
              </p>
              <p className="text-sm text-muted-foreground">Questions: {questions.length}</p>
            </div>

            <Button onClick={enterFullscreen} className="w-full" size="lg">
              <Maximize className="mr-2 h-5 w-5" />
              Enter Fullscreen & Start Test
            </Button>
            
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
              Go Back
            </Button>
          </CardContent>
        </Card>
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
    <div className="min-h-screen bg-background select-none">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="container flex items-center justify-between py-4">
            <div>
              <h1 className="font-display font-bold">{application?.jobs.title}</h1>
              <p className="text-sm text-muted-foreground">
                {currentRoundInfo?.name || `Round ${application?.current_round}`} of {application?.jobs.total_rounds || 1}
                {currentRoundInfo?.description && (
                  <span className="block text-xs mt-0.5">{currentRoundInfo.description}</span>
                )}
              </p>
            </div>
          <div className="flex items-center gap-4">
            {violationCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4" />
                {violationCount}/2 violations
              </div>
            )}
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
              Warning: Violation Detected
            </DialogTitle>
            <DialogDescription>
              {warningMessage}
              <br /><br />
              <strong className="text-destructive">Violations: {violationCount} of 2</strong>
              <br />
              After 2 violations, your test will be automatically submitted.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => {
            setShowWarning(false);
            // Re-enter fullscreen if exited
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            }
          }}>
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
