import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Clock, 
  Building2,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  FileText,
  AlertCircle
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  department: string | null;
  location: string | null;
  salary_range: string | null;
  total_rounds: number | null;
  created_at: string;
}

export default function JobDetails() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [existingApplication, setExistingApplication] = useState<string | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchJob();
    if (user) {
      checkExistingApplication();
      checkProfile();
    }
  }, [jobId, user]);

  const fetchJob = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (err) {
      console.error('Error fetching job:', err);
      navigate('/jobs');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingApplication = async () => {
    const { data } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('user_id', user!.id)
      .single();

    if (data) {
      setExistingApplication(data.id);
    }
  };

  const checkProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('profile_completed')
      .eq('user_id', user!.id)
      .single();

    setProfileComplete(data?.profile_completed || false);
  };

  const handleApply = async () => {
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent(`/jobs/${jobId}`));
      return;
    }

    if (!profileComplete) {
      toast({
        title: 'Complete Your Profile',
        description: 'Please complete your profile before applying for jobs.',
        variant: 'destructive',
      });
      navigate('/profile');
      return;
    }

    setApplying(true);
    try {
      const { data, error } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          job_id: jobId,
          status: 'applied',
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: 'Application Submitted!',
        description: 'Now select a time slot for your test.',
      });

      navigate(`/select-slot/${data.id}`);
    } catch (err: any) {
      console.error('Error applying:', err);
      toast({
        title: 'Application Failed',
        description: err.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Job Not Found</h2>
            <Button asChild>
              <Link to="/jobs">Browse Jobs</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container max-w-4xl">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/jobs')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <CardTitle className="font-display text-2xl mb-3">
                    {job.title}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    {job.department && (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {job.department}
                      </div>
                    )}
                    {job.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </div>
                    )}
                    {job.salary_range && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {job.salary_range}
                      </div>
                    )}
                    {job.total_rounds && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {job.total_rounds} Round{job.total_rounds > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {job.description && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {job.description}
                  </p>
                </div>
              )}
              
              {job.requirements && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Requirements</h3>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {job.requirements}
                  </p>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Posted {new Date(job.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </CardContent>
          </Card>

          {/* Application Actions */}
          <Card>
            <CardContent className="pt-6">
              {!user ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    <p className="text-muted-foreground">Sign in to apply for this position</p>
                  </div>
                  <Button asChild>
                    <Link to={`/auth?redirect=${encodeURIComponent(`/jobs/${jobId}`)}`}>
                      Sign In to Apply
                    </Link>
                  </Button>
                </div>
              ) : existingApplication ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <p className="text-success">You have already applied for this position</p>
                  </div>
                  <Button asChild variant="outline">
                    <Link to="/dashboard">View Application</Link>
                  </Button>
                </div>
              ) : !profileComplete ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-warning" />
                    <p className="text-muted-foreground">Complete your profile to apply</p>
                  </div>
                  <Button asChild>
                    <Link to="/profile">Complete Profile</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold mb-1">Ready to Apply?</p>
                    <p className="text-sm text-muted-foreground">
                      Submit your application and select a test slot
                    </p>
                  </div>
                  <Button onClick={handleApply} disabled={applying} variant="hero">
                    {applying ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Briefcase className="h-4 w-4 mr-2" />
                    )}
                    Apply Now
                  </Button>
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
