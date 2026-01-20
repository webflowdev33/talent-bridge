import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Loader2
} from 'lucide-react';

interface Application {
  id: string;
  status: string;
  current_round: number;
  test_enabled: boolean;
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

interface Profile {
  full_name: string | null;
  email: string | null;
  profile_completed: boolean;
  resume_url: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  applied: { label: 'Applied', color: 'bg-blue-100 text-blue-800', icon: Clock },
  slot_selected: { label: 'Slot Selected', color: 'bg-purple-100 text-purple-800', icon: Clock },
  approved: { label: 'Approved', color: 'bg-cyan-100 text-cyan-800', icon: CheckCircle2 },
  test_enabled: { label: 'Test Enabled', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  test_taken: { label: 'Test Taken', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  passed: { label: 'Passed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: XCircle },
  next_round: { label: 'Next Round', color: 'bg-indigo-100 text-indigo-800', icon: ArrowRight },
  selected: { label: 'Selected', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function Dashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
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
        .select('full_name, email, profile_completed, resume_url')
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
          created_at,
          jobs (id, title, department, total_rounds),
          slots (slot_date, start_time, end_time)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      setApplications(appsData as unknown as Application[] || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">
              Welcome back, {profile?.full_name || 'Candidate'}
            </h1>
            <p className="text-muted-foreground">
              Track your applications and test progress here.
            </p>
          </div>

          {/* Profile Completion Card */}
          {!profile?.profile_completed && (
            <Card className="mb-8 border-warning/50 bg-warning/5">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-warning" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Complete Your Profile</CardTitle>
                    <CardDescription>
                      You need to complete your profile before applying for jobs.
                    </CardDescription>
                  </div>
                  <Button asChild>
                    <Link to="/profile">
                      Complete Profile
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Profile completion</span>
                    <span className="font-medium">{profileProgress}%</span>
                  </div>
                  <Progress value={profileProgress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{applications.length}</p>
                    <p className="text-sm text-muted-foreground">Applications</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {applications.filter(a => a.status === 'passed' || a.status === 'selected').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Passed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {applications.filter(a => a.test_enabled && a.status !== 'test_taken').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Pending Tests</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {profile?.resume_url ? 1 : 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Resume</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Applications List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Applications</CardTitle>
                  <CardDescription>Track the status of your job applications</CardDescription>
                </div>
                <Button asChild variant="outline">
                  <Link to="/jobs">
                    Browse Jobs
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold mb-2">No Applications Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by browsing available job openings.
                  </p>
                  <Button asChild>
                    <Link to="/jobs">Browse Jobs</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => {
                    const status = statusConfig[app.status] || statusConfig.applied;
                    const StatusIcon = status.icon;
                    
                    return (
                      <div 
                        key={app.id} 
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-4 mb-4 md:mb-0">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Briefcase className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{app.jobs.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {app.jobs.department} • Round {app.current_round} of {app.jobs.total_rounds || 1}
                            </p>
                            {app.slots && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Scheduled: {new Date(app.slots.slot_date).toLocaleDateString()} at {app.slots.start_time}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={status.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                          {/* Show Select Slot if applied but no slot selected */}
                          {app.status === 'applied' && !app.slots && (
                            <Button size="sm" asChild variant="outline">
                              <Link to={`/select-slot/${app.id}`}>
                                Select Slot
                              </Link>
                            </Button>
                          )}
                          {/* Show Start Test if test is enabled */}
                          {app.test_enabled && app.status !== 'test_taken' && app.status !== 'passed' && app.status !== 'failed' && (
                            <Button size="sm" asChild>
                              <Link to={`/test/${app.id}`}>
                                Start Test
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
