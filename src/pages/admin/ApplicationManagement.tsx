import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  FileText,
  Loader2,
  UserCheck,
  Trash2,
  Briefcase,
  ChevronRight,
  Star,
  Eye,
  Phone,
  Mail,
  Calendar,
  ArrowUpRight,
  Users,
  Clock,
  Filter
} from 'lucide-react';
import { EvaluateDialog } from '@/components/admin/EvaluateDialog';
import { format } from 'date-fns';

interface TestAttempt {
  id: string;
  round_number: number | null;
  is_passed: boolean | null;
  is_submitted: boolean | null;
  obtained_marks: number | null;
  total_marks: number | null;
  started_at: string | null;
  ended_at: string | null;
}

interface EvaluationScore {
  id: string;
  score: number;
  remarks: string | null;
  parameter: {
    id: string;
    name: string;
    max_score: number;
  };
}

interface Evaluation {
  id: string;
  round_number: number;
  recommendation: string;
  overall_remarks: string | null;
  is_visible_to_candidate: boolean;
  created_at: string;
  scores: EvaluationScore[];
}

interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: string | null;
  admin_approved: boolean | null;
  test_enabled: boolean | null;
  current_round: number | null;
  slot_id: string | null;
  created_at: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    resume_url: string | null;
    avatar_url: string | null;
    skills?: string[] | null;
  };
  jobs?: {
    title: string;
    total_rounds: number | null;
  };
  slots?: {
    slot_date: string;
    start_time: string;
    end_time: string;
  };
  test_attempts?: TestAttempt[];
}

interface Job {
  id: string;
  title: string;
  total_rounds: number | null;
}

export default function ApplicationManagement() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [evaluateOpen, setEvaluateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState<Application | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [avatarUrls, setAvatarUrls] = useState<Map<string, string>>(new Map());
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();
    fetchJobs();
  }, []);

  // Fetch evaluations when opening details
  useEffect(() => {
    if (detailsOpen && selectedApp) {
      fetchEvaluations(selectedApp.id);
    } else {
      setEvaluations([]);
    }
  }, [detailsOpen, selectedApp?.id]);

  const fetchEvaluations = async (applicationId: string) => {
    setEvaluationsLoading(true);
    try {
      const { data: evalData, error: evalError } = await supabase
        .from('candidate_evaluations')
        .select('id, round_number, recommendation, overall_remarks, is_visible_to_candidate, created_at')
        .eq('application_id', applicationId)
        .order('round_number', { ascending: true });

      if (evalError) throw evalError;

      if (!evalData || evalData.length === 0) {
        setEvaluations([]);
        return;
      }

      const evalIds = evalData.map(e => e.id);
      const { data: scoresData, error: scoresError } = await supabase
        .from('evaluation_scores')
        .select('id, evaluation_id, score, remarks, parameter_id')
        .in('evaluation_id', evalIds);

      if (scoresError) throw scoresError;

      const paramIds = [...new Set((scoresData || []).map(s => s.parameter_id))];
      const { data: paramsData } = await supabase
        .from('evaluation_parameters')
        .select('id, name, max_score')
        .in('id', paramIds);

      const paramsMap = new Map((paramsData || []).map(p => [p.id, p]));

      const evaluationsWithScores: Evaluation[] = evalData.map(ev => ({
        ...ev,
        scores: (scoresData || [])
          .filter(s => s.evaluation_id === ev.id)
          .map(s => ({
            id: s.id,
            score: s.score,
            remarks: s.remarks,
            parameter: paramsMap.get(s.parameter_id) || { id: s.parameter_id, name: 'Unknown', max_score: 10 }
          }))
      }));

      setEvaluations(evaluationsWithScores);
    } catch (error) {
      console.error('Error fetching evaluations:', error);
    } finally {
      setEvaluationsLoading(false);
    }
  };

  const fetchJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('id, title, total_rounds')
      .order('title');
    setJobs(data || []);
  };

  const fetchApplications = async () => {
    try {
      const { data: appsData, error } = await supabase
        .from('applications')
        .select(`
          *,
          jobs:job_id (title, total_rounds),
          slots:slot_id (slot_date, start_time, end_time)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = [...new Set((appsData || []).map(app => app.user_id))];
      const appIds = (appsData || []).map(app => app.id);
      
      const [profilesRes, testAttemptsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email, phone, resume_url, avatar_url').in('user_id', userIds),
        supabase.from('test_attempts').select('id, application_id, round_number, is_passed, is_submitted, obtained_marks, total_marks, started_at, ended_at').in('application_id', appIds)
      ]);

      const profilesMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);
      const testAttemptsMap = new Map<string, TestAttempt[]>();
      
      (testAttemptsRes.data || []).forEach(attempt => {
        const existing = testAttemptsMap.get(attempt.application_id) || [];
        existing.push(attempt);
        testAttemptsMap.set(attempt.application_id, existing);
      });
      
      const enrichedApps = (appsData || []).map(app => ({
        ...app,
        profiles: profilesMap.get(app.user_id) || null,
        test_attempts: testAttemptsMap.get(app.id) || []
      }));

      setApplications(enrichedApps as Application[]);

      // Generate avatar URLs
      const avatarUrlMap = new Map<string, string>();
      await Promise.all(
        (profilesRes.data || []).filter(p => p.avatar_url).map(async (profile) => {
          try {
            if (profile.avatar_url!.startsWith('http')) {
              avatarUrlMap.set(profile.user_id, profile.avatar_url!);
            } else {
              const { data } = await supabase.storage.from('avatars').createSignedUrl(profile.avatar_url!, 3600);
              if (data) avatarUrlMap.set(profile.user_id, data.signedUrl);
            }
          } catch {}
        })
      );
      setAvatarUrls(avatarUrlMap);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (app: Application) => {
    setActionLoading(app.id);
    try {
      await supabase.from('applications').update({ admin_approved: true }).eq('id', app.id);
      toast({ title: 'Approved', description: `${getDisplayName(app)} approved` });
      fetchApplications();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (app: Application) => {
    setActionLoading(app.id);
    try {
      await supabase.from('applications').update({ status: 'rejected', admin_approved: false }).eq('id', app.id);
      toast({ title: 'Rejected', description: `${getDisplayName(app)} rejected` });
      fetchApplications();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnableTest = async (app: Application) => {
    setActionLoading(app.id);
    try {
      await supabase.from('applications').update({ test_enabled: !app.test_enabled }).eq('id', app.id);
      toast({ title: 'Success', description: `Test ${!app.test_enabled ? 'enabled' : 'disabled'}` });
      fetchApplications();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMoveToNextRound = async (app: Application) => {
    setActionLoading(app.id);
    try {
      const totalRounds = app.jobs?.total_rounds || 1;
      const currentRound = app.current_round || 1;

      // Update any existing evaluation for this round to 'pass'
      await supabase
        .from('candidate_evaluations')
        .update({ recommendation: 'pass' })
        .eq('application_id', app.id)
        .eq('round_number', currentRound);

      if (currentRound >= totalRounds) {
        await supabase.from('applications').update({ status: 'selected' }).eq('id', app.id);
        toast({ title: 'Success', description: 'Candidate selected!' });
      } else {
        await supabase.from('applications').update({ 
          current_round: currentRound + 1,
          test_enabled: false,
          status: 'passed'
        }).eq('id', app.id);
        toast({ title: 'Success', description: `Moved to round ${currentRound + 1}` });
      }
      fetchApplications();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!appToDelete) return;
    setActionLoading(appToDelete.id);
    try {
      if (appToDelete.slot_id) {
        const { data: slotData } = await supabase.from('slots').select('id, current_capacity').eq('id', appToDelete.slot_id).single();
        if (slotData) {
          await supabase.from('slots').update({ current_capacity: Math.max((slotData.current_capacity || 0) - 1, 0) }).eq('id', slotData.id);
        }
      }
      await supabase.from('applications').delete().eq('id', appToDelete.id);
      toast({ title: 'Deleted', description: 'Application removed' });
      setDeleteOpen(false);
      setAppToDelete(null);
      fetchApplications();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewResume = async (resumePath: string) => {
    if (resumePath.startsWith('http')) {
      window.open(resumePath, '_blank');
      return;
    }
    try {
      const { data } = await supabase.storage.from('resumes').createSignedUrl(resumePath, 3600);
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to open resume', variant: 'destructive' });
    }
  };

  // Computed values
  const maxRounds = useMemo(() => {
    const jobRounds = jobFilter !== 'all' 
      ? jobs.find(j => j.id === jobFilter)?.total_rounds || 3
      : Math.max(3, ...applications.map(a => a.jobs?.total_rounds || 1));
    return jobRounds;
  }, [applications, jobs, jobFilter]);

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = !searchTerm || 
        app.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesJob = jobFilter === 'all' || app.job_id === jobFilter;
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'pending' && !app.admin_approved && app.status !== 'rejected' && app.status !== 'selected') ||
        (statusFilter === 'approved' && app.admin_approved && app.status !== 'rejected' && app.status !== 'selected') ||
        (statusFilter === 'selected' && app.status === 'selected') ||
        (statusFilter === 'rejected' && app.status === 'rejected');
      return matchesSearch && matchesJob && matchesStatus;
    });
  }, [applications, searchTerm, jobFilter, statusFilter]);

  const categorizedApps = useMemo(() => {
    const pending = filteredApplications.filter(a => !a.admin_approved && a.status !== 'rejected' && a.status !== 'selected');
    const byRound: Record<number, Application[]> = {};
    for (let i = 1; i <= maxRounds; i++) byRound[i] = [];
    filteredApplications.filter(a => a.admin_approved && a.status !== 'rejected' && a.status !== 'selected').forEach(a => {
      const round = a.current_round || 1;
      if (byRound[round]) byRound[round].push(a);
    });
    const selected = filteredApplications.filter(a => a.status === 'selected');
    const rejected = filteredApplications.filter(a => a.status === 'rejected');
    return { pending, byRound, selected, rejected };
  }, [filteredApplications, maxRounds]);

  const getDisplayName = (app: Application) =>
    app.profiles?.full_name?.trim() || app.profiles?.email?.trim() || 'Unknown user';

  const getInitials = (app: Application) => {
    const name = getDisplayName(app);
    if (name === 'Unknown user') return 'U';
    return name.split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const getStatusBadge = (app: Application) => {
    if (app.status === 'rejected') return <Badge variant="destructive" className="text-xs">Rejected</Badge>;
    if (app.status === 'selected') return <Badge className="bg-success text-success-foreground text-xs">Selected</Badge>;
    if (app.status === 'passed') return <Badge className="bg-success/80 text-success-foreground text-xs">Passed</Badge>;
    if (app.status === 'failed') return <Badge variant="destructive" className="text-xs">Failed</Badge>;
    if (!app.admin_approved) return <Badge variant="outline" className="bg-warning/10 text-warning border-warning text-xs">Pending</Badge>;
    if (app.test_enabled) return <Badge className="bg-primary text-primary-foreground text-xs">Testing</Badge>;
    return <Badge variant="outline" className="text-xs">Approved</Badge>;
  };

  const CandidateRow = ({ app, showRoundActions = true }: { app: Application; showRoundActions?: boolean }) => (
    <tr 
      className="border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => { setSelectedApp(app); setDetailsOpen(true); }}
    >
      {/* Candidate */}
      <td className="p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={avatarUrls.get(app.user_id)} />
            <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
              {getInitials(app)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-sm">{getDisplayName(app)}</p>
            <p className="text-xs text-muted-foreground truncate">{app.profiles?.email ?? '—'}</p>
          </div>
        </div>
      </td>

      {/* Job */}
      <td className="p-3 hidden md:table-cell">
        <Badge variant="outline" className="text-xs font-normal">
          {app.jobs?.title || 'Job'}
        </Badge>
      </td>

      {/* Round */}
      <td className="p-3 hidden lg:table-cell">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-primary">{app.current_round || 1}</span>
          <span className="text-xs text-muted-foreground">/ {app.jobs?.total_rounds || 1}</span>
        </div>
      </td>

      {/* Status */}
      <td className="p-3">
        {getStatusBadge(app)}
      </td>

      {/* Applied Date */}
      <td className="p-3 hidden sm:table-cell text-sm text-muted-foreground">
        {app.created_at ? format(new Date(app.created_at), 'MMM d') : '-'}
      </td>

      {/* Actions */}
      <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          {!app.admin_approved && app.status !== 'rejected' && app.status !== 'selected' && (
            <>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
                onClick={() => handleApprove(app)}
                disabled={actionLoading === app.id}
                title="Approve"
              >
                {actionLoading === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleReject(app)}
                disabled={actionLoading === app.id}
                title="Reject"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {showRoundActions && app.admin_approved && app.status !== 'rejected' && app.status !== 'selected' && (
            <>
              <Button 
                size="sm" 
                variant={app.test_enabled ? "default" : "ghost"}
                className={`h-8 px-2 text-xs ${app.test_enabled ? 'bg-primary' : ''}`}
                onClick={() => handleEnableTest(app)}
                disabled={actionLoading === app.id}
                title={app.test_enabled ? 'Disable Test' : 'Enable Test'}
              >
                {app.test_enabled ? 'Testing' : 'Test'}
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 w-8 p-0"
                onClick={() => { setSelectedApp(app); setEvaluateOpen(true); }}
                title="Evaluate"
              >
                <Star className="h-4 w-4" />
              </Button>
              {app.status === 'passed' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 px-2 text-xs text-primary border-primary"
                  onClick={() => handleMoveToNextRound(app)}
                  disabled={actionLoading === app.id}
                >
                  <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                  {(app.current_round || 1) >= (app.jobs?.total_rounds || 1) ? 'Select' : 'Next'}
                </Button>
              )}
            </>
          )}

          {app.profiles?.resume_url && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0"
              onClick={() => handleViewResume(app.profiles!.resume_url!)}
              title="View Resume"
            >
              <FileText className="h-4 w-4" />
            </Button>
          )}
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => { setAppToDelete(app); setDeleteOpen(true); }}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );

  const CandidateList = ({ apps, showRoundActions = true, emptyMessage = "No candidates" }: { 
    apps: Application[]; 
    showRoundActions?: boolean;
    emptyMessage?: string;
  }) => (
    <Card>
      {apps.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-xs font-medium text-muted-foreground">
                <th className="p-3 text-left">Candidate</th>
                <th className="p-3 text-left hidden md:table-cell">Job</th>
                <th className="p-3 text-left hidden lg:table-cell">Round</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left hidden sm:table-cell">Applied</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(app => <CandidateRow key={app.id} app={app} showRoundActions={showRoundActions} />)}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );


  if (loading) {
    return (
      <AdminLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
            <p className="text-sm text-muted-foreground">{applications.length} total candidates</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-warning/10 border border-warning/20">
              <Clock className="h-3.5 w-3.5 text-warning" />
              <span className="text-xs font-medium">{categorizedApps.pending.length} Pending</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-success/10 border border-success/20">
              <UserCheck className="h-3.5 w-3.5 text-success" />
              <span className="text-xs font-medium">{categorizedApps.selected.length} Selected</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-destructive/10 border border-destructive/20">
              <XCircle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs font-medium">{categorizedApps.rejected.length} Rejected</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger className="h-9 w-[180px]">
                  <Briefcase className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All Jobs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  {jobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[140px]">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="selected">Selected</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="bg-background border h-auto p-1 flex-wrap">
            <TabsTrigger value="pending" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Pending ({categorizedApps.pending.length})
            </TabsTrigger>
            {Array.from({ length: maxRounds }).map((_, i) => (
              <TabsTrigger key={i + 1} value={`round-${i + 1}`} className="gap-1.5">
                Round {i + 1} ({categorizedApps.byRound[i + 1]?.length || 0})
              </TabsTrigger>
            ))}
            <TabsTrigger value="selected" className="gap-1.5 text-success">
              <CheckCircle className="h-3.5 w-3.5" />
              Selected ({categorizedApps.selected.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-1.5 text-destructive">
              <XCircle className="h-3.5 w-3.5" />
              Rejected ({categorizedApps.rejected.length})
            </TabsTrigger>
          </TabsList>


          {/* Pending Tab */}
          <TabsContent value="pending">
            <CandidateList apps={categorizedApps.pending} emptyMessage="No pending applications" />
          </TabsContent>

          {/* Round Tabs */}
          {Array.from({ length: maxRounds }).map((_, i) => (
            <TabsContent key={i + 1} value={`round-${i + 1}`}>
              <CandidateList apps={categorizedApps.byRound[i + 1] || []} emptyMessage={`No candidates in Round ${i + 1}`} />
            </TabsContent>
          ))}

          {/* Selected Tab */}
          <TabsContent value="selected">
            <CandidateList apps={categorizedApps.selected} showRoundActions={false} emptyMessage="No selected candidates yet" />
          </TabsContent>

          {/* Rejected Tab */}
          <TabsContent value="rejected">
            <CandidateList apps={categorizedApps.rejected} showRoundActions={false} emptyMessage="No rejected candidates" />
          </TabsContent>
        </Tabs>
      

      {/* Candidate Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedApp && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={avatarUrls.get(selectedApp.user_id)} />
                    <AvatarFallback className="text-lg">
                      {getInitials(selectedApp)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-left">{getDisplayName(selectedApp)}</SheetTitle>
                    <SheetDescription className="text-left">
                      {selectedApp.jobs?.title} • Round {selectedApp.current_round || 1}/{selectedApp.jobs?.total_rounds || 1}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Contact Info */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Contact</h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{selectedApp.profiles?.email ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{selectedApp.profiles?.phone ?? '—'}</span>
                    </div>
                  </div>
                </div>

              <Separator />

              {/* Job Assignment */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Job Assignment</h4>
                <Select 
                  value={selectedApp.job_id} 
                  onValueChange={async (newJobId) => {
                    if (newJobId === selectedApp.job_id) return;
                    setActionLoading(selectedApp.id);
                    try {
                      const newJob = jobs.find(j => j.id === newJobId);
                      await supabase.from('applications').update({ 
                        job_id: newJobId,
                        current_round: 1,
                        status: 'applied',
                        admin_approved: false,
                        test_enabled: false
                      }).eq('id', selectedApp.id);
                      toast({ 
                        title: 'Job Updated', 
                        description: `Moved to ${newJob?.title}. Application reset to pending.` 
                      });
                      fetchApplications();
                      setDetailsOpen(false);
                    } catch (error: any) {
                      toast({ title: 'Error', description: error.message, variant: 'destructive' });
                    } finally {
                      setActionLoading(null);
                    }
                  }}
                  disabled={actionLoading === selectedApp.id}
                >
                  <SelectTrigger className="w-full">
                    <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map(job => (
                      <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Changing the job will reset the application to pending status
                </p>
              </div>

              <Separator />

              {/* Status & Actions */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Status</h4>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedApp)}
                  {selectedApp.slots && (
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(selectedApp.slots.slot_date), 'MMM d')} at {selectedApp.slots.start_time}
                    </Badge>
                  )}
                </div>
                  
                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedApp.profiles?.resume_url && (
                      <Button size="sm" variant="outline" onClick={() => handleViewResume(selectedApp.profiles!.resume_url!)}>
                        <FileText className="h-4 w-4 mr-1.5" />
                        View Resume
                      </Button>
                    )}
                    {selectedApp.admin_approved && selectedApp.status !== 'rejected' && selectedApp.status !== 'selected' && (
                      <Button size="sm" variant="outline" onClick={() => { setDetailsOpen(false); setEvaluateOpen(true); }}>
                        <Star className="h-4 w-4 mr-1.5" />
                        Evaluate
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Skills */}
                {selectedApp.profiles?.skills && selectedApp.profiles.skills.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Skills</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedApp.profiles.skills.map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Round Progress */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Round Progress</h4>
                  <div className="space-y-2">
                    {Array.from({ length: selectedApp.jobs?.total_rounds || 1 }).map((_, idx) => {
                      const roundNum = idx + 1;
                      const testAttempt = selectedApp.test_attempts?.find(t => t.round_number === roundNum);
                      const isSelected = selectedApp.status === 'selected';
                      const isRejected = selectedApp.status === 'rejected';
                      const isCurrent = !isSelected && !isRejected && selectedApp.current_round === roundNum;
                      const isPast = (selectedApp.current_round || 1) > roundNum;
                      
                      // All rounds are passed if candidate is selected
                      // Otherwise, check test attempt or if they've moved past this round
                      const isPassed = isSelected || testAttempt?.is_passed === true || (isPast && !isRejected);
                      const isFailed = !isSelected && (testAttempt?.is_passed === false || (isRejected && selectedApp.current_round === roundNum));

                      return (
                        <div 
                          key={roundNum}
                          className={`flex items-center justify-between p-2.5 rounded-lg border ${
                            isCurrent ? 'border-primary bg-primary/5' : 
                            isPassed ? 'border-success/30 bg-success/5' :
                            isFailed ? 'border-destructive/30 bg-destructive/5' : 'border-border'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              isPassed ? 'bg-success text-success-foreground' : 
                              isFailed ? 'bg-destructive text-destructive-foreground' :
                              isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                            }`}>
                              {isPassed ? <CheckCircle className="h-3.5 w-3.5" /> : 
                               isFailed ? <XCircle className="h-3.5 w-3.5" /> : roundNum}
                            </div>
                            <span className="text-sm font-medium">Round {roundNum}</span>
                          </div>
                          <div className="text-right">
                            {testAttempt?.is_submitted && (
                              <span className="text-xs text-muted-foreground">
                                {testAttempt.obtained_marks}/{testAttempt.total_marks}
                              </span>
                            )}
                            {isPassed && !testAttempt?.is_submitted && (
                              <Badge className="text-xs bg-success/10 text-success border-success/30">Passed</Badge>
                            )}
                            {isFailed && (
                              <Badge className="text-xs bg-destructive/10 text-destructive border-destructive/30">Failed</Badge>
                            )}
                            {isCurrent && !testAttempt?.is_submitted && (
                              <Badge variant="outline" className="text-xs">Current</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Evaluations Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Evaluations</h4>
                  {evaluationsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : evaluations.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-lg">
                      No evaluations yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {evaluations.map(evaluation => {
                        const totalScore = evaluation.scores.reduce((sum, s) => sum + s.score, 0);
                        const maxScore = evaluation.scores.reduce((sum, s) => sum + s.parameter.max_score, 0);
                        const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

                        return (
                          <div key={evaluation.id} className="border rounded-lg overflow-hidden">
                            {/* Round Header */}
                            <div className={`px-3 py-2 flex items-center justify-between ${
                              evaluation.recommendation === 'pass' ? 'bg-success/10' :
                              evaluation.recommendation === 'fail' ? 'bg-destructive/10' : 'bg-warning/10'
                            }`}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">Round {evaluation.round_number}</span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    evaluation.recommendation === 'pass' ? 'border-success text-success' :
                                    evaluation.recommendation === 'fail' ? 'border-destructive text-destructive' : 'border-warning text-warning'
                                  }`}
                                >
                                  {evaluation.recommendation.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{totalScore}/{maxScore}</span>
                                <Badge variant="secondary" className="text-xs">{percentage}%</Badge>
                              </div>
                            </div>

                            {/* Scores */}
                            <div className="p-3 space-y-2">
                              {evaluation.scores.map(score => (
                                <div key={score.id} className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">{score.parameter.name}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-primary rounded-full" 
                                        style={{ width: `${(score.score / score.parameter.max_score) * 100}%` }}
                                      />
                                    </div>
                                    <span className="font-medium w-12 text-right">{score.score}/{score.parameter.max_score}</span>
                                  </div>
                                </div>
                              ))}

                              {/* Overall Remarks */}
                              {evaluation.overall_remarks && (
                                <div className="mt-3 pt-2 border-t">
                                  <p className="text-xs text-muted-foreground mb-1">Remarks:</p>
                                  <p className="text-sm">{evaluation.overall_remarks}</p>
                                </div>
                              )}

                              {/* Visibility indicator */}
                              <div className="flex items-center gap-1 mt-2 pt-2 border-t text-xs text-muted-foreground">
                                {evaluation.is_visible_to_candidate ? (
                                  <>
                                    <Eye className="h-3 w-3" />
                                    <span>Visible to candidate</span>
                                  </>
                                ) : (
                                  <span>Hidden from candidate</span>
                                )}
                                <span className="ml-auto">{format(new Date(evaluation.created_at), 'MMM d, yyyy')}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Applied Date */}
                <div className="text-xs text-muted-foreground pt-2">
                  Applied on {selectedApp.created_at ? format(new Date(selectedApp.created_at), 'MMMM d, yyyy') : 'Unknown date'}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Application?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {appToDelete ? getDisplayName(appToDelete) : 'this candidate'}'s application and all test data. They will be able to apply again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionLoading === appToDelete?.id}
            >
              {actionLoading === appToDelete?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Evaluate Dialog */}
      <EvaluateDialog
        open={evaluateOpen}
        onOpenChange={setEvaluateOpen}
        application={selectedApp}
        onEvaluationComplete={() => {
          setSelectedApp(null);
          fetchApplications();
        }}
      />

      </div>
    </AdminLayout>
  );
}
