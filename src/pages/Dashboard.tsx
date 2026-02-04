import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { 
  User, 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ArrowRight,
  FileText,
  Loader2,
  Trophy,
  Target,
  BookOpen,
  ClipboardList
} from 'lucide-react';

interface Application {
  id: string;
  status: string;
  current_round: number;
  test_enabled: boolean;
  admin_approved: boolean | null;
  created_at: string;
  jobs: {
    id: string;
    title: string;
    department: string | null;
    total_rounds: number | null;
  };
  slots: {
    slot_date: string;
    start_time: string;
    end_time: string;
  } | null;
}

interface TestAttempt {
  id: string;
  round_number: number;
  is_passed: boolean | null;
  obtained_marks: number | null;
  total_marks: number | null;
  is_submitted: boolean;
  started_at: string;
  application_id: string;
}

interface JobRound {
  round_number: number;
  name: string;
  description: string | null;
}

interface CandidateEvaluation {
  id: string;
  application_id: string;
  round_number: number;
  recommendation: string;
  overall_remarks: string | null;
  is_visible_to_candidate: boolean;
  scores: Array<{
    parameter_name: string;
    score: number;
    max_score: number;
    remarks: string | null;
  }>;
}

interface Profile {
  full_name: string | null;
  email: string | null;
  profile_completed: boolean;
  resume_url: string | null;
  avatar_url: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  applied: { label: 'Applied', color: 'bg-secondary text-foreground border border-border', icon: Clock },
  slot_selected: { label: 'Slot Selected', color: 'bg-secondary text-foreground border border-border', icon: Clock },
  approved: { label: 'Approved', color: 'bg-secondary text-foreground border border-border', icon: CheckCircle2 },
  test_enabled: { label: 'Test Enabled', color: 'bg-primary text-white', icon: CheckCircle2 },
  test_taken: { label: 'Test Taken', color: 'bg-secondary text-foreground border border-border', icon: Clock },
  passed: { label: 'Passed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: XCircle },
  next_round: { label: 'Next Round', color: 'bg-secondary text-foreground border border-border', icon: ArrowRight },
  selected: { label: 'Selected', color: 'bg-primary text-white', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function Dashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([]);
  const [jobRoundsMap, setJobRoundsMap] = useState<Record<string, JobRound[]>>({});
  const [evaluationsMap, setEvaluationsMap] = useState<Record<string, CandidateEvaluation[]>>({});
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, profile_completed, resume_url, avatar_url')
        .eq('user_id', user!.id)
        .single();

      setProfile(profileData);

      // Fetch applications with job and slot details
      const { data: appsData } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          current_round,
          test_enabled,
          admin_approved,
          created_at,
          jobs (id, title, department, total_rounds),
          slots (slot_date, start_time, end_time)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      setApplications(appsData as unknown as Application[] || []);

      // Fetch test attempts for round breakdown
      const applicationIds = (appsData || []).map(app => app.id);
      if (applicationIds.length > 0) {
        const { data: attemptsData } = await supabase
          .from('test_attempts')
          .select('id, round_number, is_passed, obtained_marks, total_marks, is_submitted, started_at, application_id')
          .in('application_id', applicationIds)
          .eq('user_id', user!.id)
          .order('round_number', { ascending: true });

        setTestAttempts(attemptsData as TestAttempt[] || []);

        // Fetch visible evaluations for the user's applications
        const { data: evaluationsData } = await supabase
          .from('candidate_evaluations')
          .select('id, application_id, round_number, recommendation, overall_remarks, is_visible_to_candidate')
          .in('application_id', applicationIds)
          .eq('is_visible_to_candidate', true)
          .order('round_number', { ascending: true });

        if (evaluationsData && evaluationsData.length > 0) {
          // Fetch evaluation scores for visible evaluations
          const evaluationIds = evaluationsData.map(e => e.id);
          const { data: scoresData } = await supabase
            .from('evaluation_scores')
            .select('evaluation_id, parameter_id, score, remarks')
            .in('evaluation_id', evaluationIds);

          // Fetch evaluation parameters for names
          const { data: parametersData } = await supabase
            .from('evaluation_parameters')
            .select('id, name, max_score');

          // Map scores to evaluations
          const paramsMap = new Map((parametersData || []).map(p => [p.id, p]));
          const scoresMap = new Map<string, Array<{ parameter_name: string; score: number; max_score: number; remarks: string | null }>>();
          
          (scoresData || []).forEach(score => {
            const param = paramsMap.get(score.parameter_id);
            if (param) {
              if (!scoresMap.has(score.evaluation_id)) {
                scoresMap.set(score.evaluation_id, []);
              }
              scoresMap.get(score.evaluation_id)!.push({
                parameter_name: param.name,
                score: score.score,
                max_score: param.max_score,
                remarks: score.remarks,
              });
            }
          });

          // Group by application_id
          const evalsMap: Record<string, CandidateEvaluation[]> = {};
          evaluationsData.forEach((evaluation) => {
            if (!evalsMap[evaluation.application_id]) {
              evalsMap[evaluation.application_id] = [];
            }
            evalsMap[evaluation.application_id].push({
              ...evaluation,
              scores: scoresMap.get(evaluation.id) || [],
            });
          });
          setEvaluationsMap(evalsMap);
        }
      }

      // Fetch job rounds for all jobs
      const jobIds = [...new Set((appsData || []).map(app => app.jobs?.id).filter(Boolean))];
      if (jobIds.length > 0) {
        const { data: roundsData } = await supabase
          .from('job_rounds')
          .select('job_id, round_number, name, description')
          .in('job_id', jobIds)
          .order('round_number', { ascending: true });

        if (roundsData) {
          const roundsMap: Record<string, JobRound[]> = {};
          roundsData.forEach((round) => {
            if (!roundsMap[round.job_id]) {
              roundsMap[round.job_id] = [];
            }
            roundsMap[round.job_id].push({
              round_number: round.round_number,
              name: round.name,
              description: round.description,
            });
          });
          setJobRoundsMap(roundsMap);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoundBreakdown = (app: Application) => {
    const attempts = testAttempts.filter(ta => ta.application_id === app.id);
    const jobRounds = jobRoundsMap[app.jobs.id] || [];
    const appEvaluations = evaluationsMap[app.id] || [];
    const rounds = [];
    const total = app.jobs.total_rounds || 1;
    const currentRound = app.current_round;

    for (let i = 1; i <= total; i++) {
      const attempt = attempts.find(ta => ta.round_number === i);
      const roundInfo = jobRounds.find(r => r.round_number === i);
      const evaluation = appEvaluations.find(e => e.round_number === i);
      const roundName = roundInfo?.name || `Round ${i}`;
      const roundDescription = roundInfo?.description || null;

      let status: 'passed' | 'failed' | 'pending' = 'pending';
      let score: number | null = null;
      let maxScore: number | null = null;
      let date: string | null = null;

      if (attempt && attempt.is_submitted) {
        status = attempt.is_passed ? 'passed' : 'failed';
        score = attempt.obtained_marks || 0;
        maxScore = attempt.total_marks || 0;
        date = attempt.started_at;
      } else {
        // No attempt recorded - reflect admin-driven status for the current round
        if (i === currentRound) {
          if (app.status === 'passed' || app.status === 'selected') {
            status = 'passed';
          } else if (app.status === 'failed' || app.status === 'rejected') {
            status = 'failed'; // Show rejected round as failed in breakdown
          }
        } else if (i < currentRound && (app.status === 'selected' || app.status === 'passed')) {
          // If candidate is selected or marked passed in a later round,
          // earlier rounds must have been cleared
          status = 'passed';
        } else if (i < currentRound && app.status === 'rejected') {
          // If rejected at a later round, earlier rounds were likely passed
          status = 'passed';
        }
      }

      rounds.push({
        round: i,
        name: roundName,
        description: roundDescription,
        status,
        score,
        total: maxScore,
        date,
        evaluation: evaluation || null,
      });
    }

    return rounds;
  };

  const getEvaluationsForApplication = (appId: string) => {
    return evaluationsMap[appId] || [];
  };

  const getCurrentRoundName = (jobId: string, currentRound: number) => {
    const jobRounds = jobRoundsMap[jobId] || [];
    const roundInfo = jobRounds.find(r => r.round_number === currentRound);
    return roundInfo?.name || `Round ${currentRound}`;
  };

  const [avatarPublicUrl, setAvatarPublicUrl] = useState<string | null>(null);

  // Generate signed URL for dashboard avatar
  useEffect(() => {
    const generateSignedUrl = async () => {
      if (!profile?.avatar_url) {
        setAvatarPublicUrl(null);
        return;
      }
      try {
        const { data, error } = await supabase.storage
          .from('avatars')
          .createSignedUrl(profile.avatar_url, 60 * 60); // 1 hour

        if (error) {
          console.error('Error creating signed avatar URL (dashboard):', error);
          setAvatarPublicUrl(null);
          return;
        }

        setAvatarPublicUrl(data?.signedUrl ?? null);
      } catch (err) {
        console.error('Error creating signed avatar URL (dashboard):', err);
        setAvatarPublicUrl(null);
      }
    };

    generateSignedUrl();
  }, [profile?.avatar_url]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const profileProgress = profile ? 
    (profile.full_name ? 25 : 0) + 
    (profile.email ? 25 : 0) + 
    (profile.resume_url ? 25 : 0) + 
    (profile.profile_completed ? 25 : 0) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      <Header />
      
      <main className="flex-1 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Welcome Section with Profile Summary */}
          <div className="mb-4 sm:mb-6 lg:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border border-border bg-secondary">
                <AvatarImage src={avatarPublicUrl || undefined} alt={profile?.full_name || 'User avatar'} />
                <AvatarFallback className="text-xs sm:text-sm font-semibold">
                  {profile?.full_name
                    ? profile.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                    : 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-0.5 sm:mb-1 text-foreground">
                  Welcome back, {profile?.full_name || 'Candidate'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {profile?.email || 'Track your applications and test progress here.'}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                asChild
                variant="outline"
                className="border border-border text-sm sm:text-base w-full sm:w-auto"
              >
                <Link to="/my-tasks">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  My Tasks
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border border-border text-sm sm:text-base w-full sm:w-auto"
              >
                <Link to="/guide?view=true">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Guidelines
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border border-border text-sm sm:text-base w-full sm:w-auto"
              >
                <Link to="/profile">View Profile</Link>
              </Button>
            </div>
          </div>

          {/* Profile Completion Alert */}
          {!profile?.profile_completed && (
            <div className="mb-4 sm:mb-6 lg:mb-8 bg-white rounded-lg border-l-4 border-primary p-4 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">Complete Your Profile</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                      You need to complete your profile before applying for jobs.
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-foreground">Profile completion</span>
                        <span className="font-medium text-foreground">{profileProgress}%</span>
                      </div>
                      <Progress value={profileProgress} className="h-1.5 sm:h-2" />
                    </div>
                  </div>
                </div>
                <Button
                  asChild
                  className="bg-primary text-white hover:bg-primary/90 font-semibold text-sm sm:text-base w-full sm:w-auto shrink-0"
                >
                  <Link to="/profile">
                    Complete Profile
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Applications Section */}
          <div className="bg-white rounded-lg shadow-sm border border-border">
            {/* Section Header */}
            <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1">Your Applications</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">Track the status of your job applications</p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold text-sm sm:text-base w-full sm:w-auto"
                >
                  <Link to="/jobs">
                    Browse Jobs
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Applications Content */}
            <div className="p-4 sm:p-6 lg:p-8">
              {applications.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <img src="/logo.svg" alt="Testrow Logo" className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground">No Applications Yet</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
                    Start by browsing available job openings.
                  </p>
                  <Button asChild className="bg-primary text-white hover:bg-primary/90 font-semibold text-sm sm:text-base">
                    <Link to="/jobs">Browse Jobs</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {applications.map((app) => {
                    const status = statusConfig[app.status] || statusConfig.applied;
                    const StatusIcon = status.icon;
                    const roundBreakdown = getRoundBreakdown(app);
                    const clearedRounds = roundBreakdown.filter(r => r.status === 'passed').length;
                    
                    return (
                      <div key={app.id} className="bg-white border-2 border-border rounded-lg p-4 sm:p-6 hover:shadow-md transition-all duration-300 hover:border-primary/30">
                        {/* Application Header */}
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-border">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                              <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-foreground mb-1 sm:mb-2 break-words">{app.jobs.title}</h3>
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">
                                {app.jobs.department && (
                                  <>
                                    <span className="font-medium">{app.jobs.department}</span>
                                    <span>•</span>
                                  </>
                                )}
                                <span>{getCurrentRoundName(app.jobs.id, app.current_round)} of {app.jobs.total_rounds || 1}</span>
                              </div>
                              {app.slots && (
                                <p className="text-xs text-muted-foreground">
                                  Scheduled: {new Date(app.slots.slot_date).toLocaleDateString()} at {app.slots.start_time}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                            <Badge className={`w-fit ${status.color} font-semibold text-xs`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`w-fit font-semibold text-xs ${
                                app.admin_approved 
                                  ? 'bg-accent/10 text-accent border-accent' 
                                  : 'bg-warning/10 text-warning border-warning'
                              }`}
                            >
                              {app.admin_approved ? 'Approved' : 'Pending Approval'}
                            </Badge>
                            {app.status === 'applied' && !app.slots && (
                              <Button
                                size="sm"
                                asChild
                                variant="outline"
                                className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold text-xs px-3 py-1.5 h-auto w-full sm:w-auto"
                              >
                                <Link to={`/select-slot/${app.id}`}>
                                  Select Slot
                                </Link>
                              </Button>
                            )}
                            {app.test_enabled && app.status !== 'test_taken' && app.status !== 'passed' && app.status !== 'failed' && (
                              <Button
                                size="sm"
                                asChild
                                className="bg-primary text-white hover:bg-primary/90 font-semibold text-xs px-3 py-1.5 h-auto shadow-sm hover:shadow-md transition-all w-full sm:w-auto"
                              >
                                <Link to={`/test/${app.id}`}>
                                  Start Test
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Congratulations Message for Selected Candidates */}
                        {app.status === 'selected' ? (
                          <div className="flex flex-col items-center text-center py-6 sm:py-8 px-4 bg-primary/10 rounded-lg border-2 border-primary/30">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/20 flex items-center justify-center mb-3 border-2 border-primary/30">
                              <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1 sm:mb-2">
                              Congratulations! 🎉
                            </h3>
                            <p className="text-xs sm:text-sm text-foreground mb-1">
                              You have been selected for <strong>{app.jobs.title}</strong>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              We'll be in touch with you shortly regarding the next steps.
                            </p>
                          </div>
                        ) : app.status === 'rejected' ? (
                          /* Rejection Message with Round Breakdown */
                          <div className="space-y-4">
                            <div className="flex flex-col items-center text-center py-4 sm:py-6 px-4 bg-red-50 rounded-lg border-2 border-red-200">
                              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-red-100 flex items-center justify-center mb-3 border-2 border-red-300">
                                <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                              </div>
                              <h3 className="text-lg sm:text-xl font-bold text-red-900 mb-1 sm:mb-2">
                                Application Rejected
                              </h3>
                              <p className="text-xs sm:text-sm text-red-800 mb-1">
                                Your application for <strong>{app.jobs.title}</strong> has been rejected
                              </p>
                              <p className="text-xs text-red-700 font-medium">
                                Rejected at: {getCurrentRoundName(app.jobs.id, app.current_round)} (Round {app.current_round})
                              </p>
                              <p className="text-xs text-red-600 mt-2">
                                Thank you for your interest. You can apply for other positions.
                              </p>
                            </div>
                            {/* Round Breakdown for Rejected Applications */}
                            {app.jobs.total_rounds && app.jobs.total_rounds > 1 && (
                              <div className="bg-secondary/50 rounded-lg p-3 sm:p-4 border border-border">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3">
                                  <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-primary" />
                                    <h4 className="text-xs sm:text-sm font-semibold text-foreground">Round Progress</h4>
                                  </div>
                                  <Badge variant="outline" className="text-xs w-fit bg-white">
                                    {clearedRounds} of {app.jobs.total_rounds} cleared
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                                  {roundBreakdown.map((round) => (
                                    <div
                                      key={round.round}
                                      className={`p-2 sm:p-3 rounded-lg border-2 transition-all ${
                                        round.status === 'passed'
                                          ? 'border-green-500 bg-green-50'
                                          : round.status === 'failed'
                                          ? round.round === app.current_round && app.status === 'rejected'
                                            ? 'border-red-600 bg-red-100'
                                            : 'border-red-500 bg-red-50'
                                          : 'border-border bg-white'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <div className="flex-1 min-w-0">
                                          <span className="text-xs font-semibold text-foreground block truncate">{round.name}</span>
                                          {round.round === app.current_round && app.status === 'rejected' && (
                                            <span className="text-xs text-red-700 font-medium">Rejected</span>
                                          )}
                                          {round.description && (
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{round.description}</p>
                                          )}
                                        </div>
                                        {round.status === 'passed' && (
                                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                                        )}
                                        {round.status === 'failed' && (
                                          <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                                        )}
                                        {round.status === 'pending' && (
                                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                        )}
                                      </div>
                                      {round.status === 'passed' && round.score !== null && (
                                        <div className="text-xs text-muted-foreground font-medium">
                                          {round.score}/{round.total}
                                        </div>
                                      )}
                                      {round.status === 'failed' && round.score !== null && (
                                        <div className="text-xs text-muted-foreground font-medium">
                                          {round.score}/{round.total}
                                        </div>
                                      )}
                                      {round.status === 'pending' && (
                                        <div className="text-xs text-muted-foreground">
                                          Pending
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Round Breakdown */
                          app.jobs.total_rounds && app.jobs.total_rounds > 1 && (
                            <div className="bg-secondary/50 rounded-lg p-3 sm:p-4 border border-border">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3">
                                <div className="flex items-center gap-2">
                                  <Target className="h-4 w-4 text-primary" />
                                  <h4 className="text-xs sm:text-sm font-semibold text-foreground">Round Progress</h4>
                                </div>
                                <Badge variant="outline" className="text-xs w-fit bg-white">
                                  {clearedRounds} of {app.jobs.total_rounds} cleared
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                                {roundBreakdown.map((round) => (
                                  <div
                                    key={round.round}
                                    className={`p-2 sm:p-3 rounded-lg border-2 transition-all ${
                                      round.status === 'passed'
                                        ? 'border-green-500 bg-green-50'
                                        : round.status === 'failed'
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-border bg-white'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                      <div className="flex-1 min-w-0">
                                        <span className="text-xs font-semibold text-foreground block truncate">{round.name}</span>
                                        {round.description && (
                                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{round.description}</p>
                                        )}
                                      </div>
                                      {round.status === 'passed' && (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                                      )}
                                      {round.status === 'failed' && (
                                        <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                                      )}
                                      {round.status === 'pending' && (
                                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                      )}
                                    </div>
                                    {round.status === 'passed' && round.score !== null && (
                                      <div className="text-xs text-muted-foreground font-medium">
                                        {round.score}/{round.total}
                                      </div>
                                    )}
                                    {round.status === 'failed' && round.score !== null && (
                                      <div className="text-xs text-muted-foreground font-medium">
                                        {round.score}/{round.total}
                                      </div>
                                    )}
                                    {round.status === 'pending' && (
                                      <div className="text-xs text-muted-foreground">
                                        Pending
                                      </div>
                                    )}
                                    {/* Show visible evaluation feedback */}
                                    {round.evaluation && (
                                      <div className="mt-2 pt-2 border-t border-border/50">
                                        <div className="text-xs font-medium text-primary mb-1">Feedback</div>
                                        {round.evaluation.scores.length > 0 && (
                                          <div className="space-y-0.5">
                                            {round.evaluation.scores.slice(0, 2).map((score, idx) => (
                                              <div key={idx} className="text-xs text-muted-foreground flex justify-between">
                                                <span className="truncate">{score.parameter_name}</span>
                                                <span className="font-medium ml-1">{score.score}/{score.max_score}</span>
                                              </div>
                                            ))}
                                            {round.evaluation.scores.length > 2 && (
                                              <div className="text-xs text-muted-foreground">
                                                +{round.evaluation.scores.length - 2} more
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {round.evaluation.overall_remarks && (
                                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                                            "{round.evaluation.overall_remarks}"
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
