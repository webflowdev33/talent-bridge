import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  CheckCircle, 
  XCircle, 
  Clock,
  Briefcase
} from 'lucide-react';

interface Application {
  id: string;
  status: string;
  current_round: number;
  admin_approved: boolean;
  user_id: string;
  job_id: string;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  jobs: {
    title: string;
    total_rounds: number | null;
  } | null;
}

interface Job {
  id: string;
  title: string;
  total_rounds: number | null;
}

interface PipelineStage {
  id: string;
  name: string;
  applications: Application[];
}

export function HiringPipeline() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
    fetchApplications();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [selectedJob]);

  const fetchJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('id, title, total_rounds')
      .eq('is_active', true)
      .order('title');
    setJobs(data || []);
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('applications')
        .select(`
          id,
          status,
          current_round,
          admin_approved,
          user_id,
          job_id,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (selectedJob !== 'all') {
        query = query.eq('job_id', selectedJob);
      }

      const { data: appData, error } = await query;
      if (error) throw error;

      // Fetch profiles and jobs separately
      const userIds = [...new Set((appData || []).map(a => a.user_id))];
      const jobIds = [...new Set((appData || []).map(a => a.job_id))];

      const [profilesRes, jobsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email, avatar_url').in('user_id', userIds),
        supabase.from('jobs').select('id, title, total_rounds').in('id', jobIds)
      ]);

      const profilesMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
      const jobsMap = new Map((jobsRes.data || []).map(j => [j.id, j]));

      const enrichedApps: Application[] = (appData || []).map(app => ({
        ...app,
        profiles: profilesMap.get(app.user_id) || null,
        jobs: jobsMap.get(app.job_id) || null,
      }));

      setApplications(enrichedApps);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine max rounds to display
  const maxRounds = selectedJob === 'all' 
    ? Math.max(3, ...applications.map(a => a.jobs?.total_rounds || 1))
    : jobs.find(j => j.id === selectedJob)?.total_rounds || 3;

  // Build pipeline stages
  const buildStages = (): PipelineStage[] => {
    const stages: PipelineStage[] = [
      {
        id: 'applied',
        name: 'Applied',
        applications: applications.filter(a => !a.admin_approved && a.status !== 'rejected' && a.status !== 'selected')
      },
      {
        id: 'approved',
        name: 'Approved',
        applications: applications.filter(a => a.admin_approved && a.current_round === 1 && a.status !== 'rejected' && a.status !== 'selected' && a.status !== 'passed')
      }
    ];

    // Add round stages
    for (let i = 1; i <= maxRounds; i++) {
      stages.push({
        id: `round-${i}`,
        name: `Round ${i}`,
        applications: applications.filter(a => {
          if (a.status === 'rejected' || a.status === 'selected') return false;
          if (a.status === 'passed' && a.current_round === i) return true;
          if (a.current_round === i + 1 && a.admin_approved) return false; // Already moved to next
          return false;
        })
      });
    }

    // Final stages
    stages.push({
      id: 'selected',
      name: 'Selected',
      applications: applications.filter(a => a.status === 'selected')
    });

    stages.push({
      id: 'rejected',
      name: 'Rejected',
      applications: applications.filter(a => a.status === 'rejected')
    });

    return stages;
  };

  const stages = buildStages();

  const getStageColor = (stageId: string) => {
    switch (stageId) {
      case 'applied': return 'bg-muted';
      case 'approved': return 'bg-primary/10';
      case 'selected': return 'bg-success/10';
      case 'rejected': return 'bg-destructive/10';
      default: return 'bg-accent/10';
    }
  };

  const getStageIcon = (stageId: string) => {
    switch (stageId) {
      case 'applied': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-primary" />;
      case 'selected': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Briefcase className="h-4 w-4 text-accent-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Hiring Pipeline</CardTitle>
        <Select value={selectedJob} onValueChange={setSelectedJob}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {jobs.map(job => (
              <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="min-w-[250px]">
                <Skeleton className="h-8 w-full mb-3" />
                <Skeleton className="h-24 w-full mb-2" />
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4 min-w-max">
              {stages.map(stage => (
                <div key={stage.id} className="min-w-[250px] max-w-[250px]">
                  <div className={`rounded-lg p-3 mb-3 ${getStageColor(stage.id)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStageIcon(stage.id)}
                        <span className="font-medium text-sm">{stage.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {stage.applications.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {stage.applications.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                        No candidates
                      </div>
                    ) : (
                      stage.applications.map(app => (
                        <div
                          key={app.id}
                          className="p-3 bg-card border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={app.profiles?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {app.profiles?.full_name
                                  ? app.profiles.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                  : <User className="h-4 w-4" />}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {app.profiles?.full_name || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {app.profiles?.email}
                              </p>
                            </div>
                          </div>
                          {selectedJob === 'all' && app.jobs?.title && (
                            <Badge variant="outline" className="text-xs w-full justify-center truncate">
                              {app.jobs.title}
                            </Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
