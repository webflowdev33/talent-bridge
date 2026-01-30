import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileText,
  ArrowUpRight,
  Loader2,
  UserCheck,
  Play,
  Trash2,
  Layers,
  Users,
  Briefcase,
  Ban,
  Calendar,
  ArrowRightLeft,
  Star
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

export default function ApplicationManagement() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarPublicUrl, setAvatarPublicUrl] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roundFilter, setRoundFilter] = useState<string>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [slotFilter, setSlotFilter] = useState<string>('all');
  const [groupByRound, setGroupByRound] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState<Application | null>(null);
  const [changeJobDialogOpen, setChangeJobDialogOpen] = useState(false);
  const [applicationToChangeJob, setApplicationToChangeJob] = useState<Application | null>(null);
  const [selectedNewJobId, setSelectedNewJobId] = useState<string>('');
  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [avatarUrls, setAvatarUrls] = useState<Map<string, string>>(new Map());
  const [evaluateDialogOpen, setEvaluateDialogOpen] = useState(false);
  const [applicationToEvaluate, setApplicationToEvaluate] = useState<Application | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title')
        .order('title');

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
    }
  };

  // Generate signed URL for avatar when application is selected
  useEffect(() => {
    const generateSignedUrl = async () => {
      if (!selectedApplication?.profiles?.avatar_url) {
        setAvatarPublicUrl(null);
        return;
      }

      // If it's already a URL (http/https), use it directly
      if (selectedApplication.profiles.avatar_url.startsWith('http://') || 
          selectedApplication.profiles.avatar_url.startsWith('https://')) {
        setAvatarPublicUrl(selectedApplication.profiles.avatar_url);
        return;
      }

      // Otherwise, generate signed URL from storage
      try {
        const { data, error } = await supabase.storage
          .from('avatars')
          .createSignedUrl(selectedApplication.profiles.avatar_url, 60 * 60); // 1 hour

        if (error) {
          console.error('Error creating signed avatar URL:', error);
          setAvatarPublicUrl(null);
          return;
        }

        setAvatarPublicUrl(data?.signedUrl ?? null);
      } catch (err) {
        console.error('Error creating signed avatar URL:', err);
        setAvatarPublicUrl(null);
      }
    };

    if (detailsDialogOpen && selectedApplication) {
      generateSignedUrl();
    }
  }, [selectedApplication?.profiles?.avatar_url, detailsDialogOpen]);

  const fetchApplications = async () => {
    try {
      // Fetch applications with jobs and slots
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          *,
          jobs:job_id (title, total_rounds),
          slots:slot_id (slot_date, start_time, end_time)
        `)
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;

      // Fetch profiles separately and merge
      const userIds = [...new Set((appsData || []).map(app => app.user_id))];
      const appIds = (appsData || []).map(app => app.id);
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone, resume_url, avatar_url')
        .in('user_id', userIds);

      // Fetch test attempts for all applications
      const { data: testAttemptsData } = await supabase
        .from('test_attempts')
        .select('id, application_id, round_number, is_passed, is_submitted, obtained_marks, total_marks, started_at, ended_at')
        .in('application_id', appIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      const testAttemptsMap = new Map<string, TestAttempt[]>();
      
      (testAttemptsData || []).forEach(attempt => {
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

      // Generate signed URLs for all avatars
      const avatarUrlMap = new Map<string, string>();
      const avatarPromises = (profilesData || [])
        .filter(profile => profile.avatar_url)
        .map(async (profile) => {
          try {
            // If it's already a URL (http/https), use it directly
            if (profile.avatar_url!.startsWith('http://') || profile.avatar_url!.startsWith('https://')) {
              avatarUrlMap.set(profile.user_id, profile.avatar_url!);
              return;
            }

            // Otherwise, generate signed URL from storage
            const { data, error } = await supabase.storage
              .from('avatars')
              .createSignedUrl(profile.avatar_url!, 60 * 60); // 1 hour

            if (!error && data) {
              avatarUrlMap.set(profile.user_id, data.signedUrl);
            }
          } catch (err) {
            console.error('Error creating signed avatar URL:', err);
          }
        });

      await Promise.all(avatarPromises);
      setAvatarUrls(avatarUrlMap);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (application: Application) => {
    setActionLoading(application.id);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ admin_approved: true })
        .eq('id', application.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Application approved' });
      fetchApplications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnapprove = async (application: Application) => {
    setActionLoading(application.id);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ admin_approved: false })
        .eq('id', application.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Application un-approved' });
      fetchApplications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (application: Application) => {
    setActionLoading(application.id);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'rejected', admin_approved: false })
        .eq('id', application.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Application rejected' });
      fetchApplications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnableTest = async (application: Application) => {
    setActionLoading(application.id);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ test_enabled: !application.test_enabled })
        .eq('id', application.id);

      if (error) throw error;
      toast({ 
        title: 'Success', 
        description: `Test ${!application.test_enabled ? 'enabled' : 'disabled'} for user` 
      });
      fetchApplications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMoveToNextRound = async (application: Application) => {
    setActionLoading(application.id);
    try {
      const totalRounds = application.jobs?.total_rounds || 1;
      const currentRound = application.current_round || 1;

      if (currentRound >= totalRounds) {
        // Final round passed - mark as selected
        const { error } = await supabase
          .from('applications')
          .update({ status: 'selected' })
          .eq('id', application.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Candidate selected!' });
      } else {
        // Move to next round
        const { error } = await supabase
          .from('applications')
          .update({ 
            current_round: currentRound + 1,
            test_enabled: false,
            status: 'passed'
          })
          .eq('id', application.id);

        if (error) throw error;
        toast({ title: 'Success', description: `Moved to round ${currentRound + 1}` });
      }
      fetchApplications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAsPassed = async (application: Application) => {
    setActionLoading(application.id);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'passed', test_enabled: false })
        .eq('id', application.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Candidate marked as passed for this round.' });
      fetchApplications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeJob = async () => {
    if (!applicationToChangeJob || !selectedNewJobId) return;

    setActionLoading(applicationToChangeJob.id);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ job_id: selectedNewJobId })
        .eq('id', applicationToChangeJob.id);

      if (error) throw error;
      
      const newJobTitle = jobs.find(j => j.id === selectedNewJobId)?.title || 'Unknown';
      toast({ 
        title: 'Success', 
        description: `Job changed to ${newJobTitle}` 
      });
      
      setChangeJobDialogOpen(false);
      setApplicationToChangeJob(null);
      setSelectedNewJobId('');
      fetchApplications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!applicationToDelete) return;

    setActionLoading(applicationToDelete.id);
    try {
      // If the application had a slot booked, decrement that slot's current_capacity
      if (applicationToDelete.slot_id) {
        try {
          const { data: slotData, error: slotError } = await supabase
            .from('slots')
            .select('id, current_capacity')
            .eq('id', applicationToDelete.slot_id)
            .single();

          if (!slotError && slotData) {
            const newCapacity = Math.max((slotData.current_capacity || 0) - 1, 0);
            await supabase
              .from('slots')
              .update({ current_capacity: newCapacity })
              .eq('id', slotData.id);
          }
        } catch (slotUpdateError) {
          console.error('Error updating slot capacity on application delete:', slotUpdateError);
          // Do not block application delete if capacity update fails
        }
      }

      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationToDelete.id);

      if (error) throw error;
      
      toast({ 
        title: 'Success', 
        description: 'Application deleted successfully. Candidate can now apply again.' 
      });
      setDeleteDialogOpen(false);
      setApplicationToDelete(null);
      fetchApplications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewResume = async (resumePath: string) => {
    try {
      // Check if it's already a URL (starts with http:// or https://)
      if (resumePath.startsWith('http://') || resumePath.startsWith('https://')) {
        // It's a direct URL, open it directly
        window.open(resumePath, '_blank');
        return;
      }

      // Otherwise, treat it as a storage path and generate a signed URL
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(resumePath, 3600); // 1 hour expiry

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        throw new Error('Failed to generate resume URL');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to open resume. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (application: Application) => {
    const status = application.status;
    const approved = application.admin_approved;
    const testEnabled = application.test_enabled;

    if (status === 'rejected') {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    if (status === 'selected') {
      return <Badge className="bg-success text-success-foreground">Selected</Badge>;
    }
    if (status === 'failed') {
      return <Badge variant="destructive">Failed</Badge>;
    }
    if (status === 'passed') {
      return <Badge className="bg-success/80 text-success-foreground">Passed</Badge>;
    }
    if (!approved) {
      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning">Pending Approval</Badge>;
    }
    if (testEnabled) {
      return <Badge className="bg-primary text-primary-foreground">Test Enabled</Badge>;
    }
    return <Badge variant="outline" className="bg-accent/10 text-accent border-accent">Approved</Badge>;
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch = 
      app.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.jobs?.title?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'pending' && !app.admin_approved && app.status !== 'rejected' && app.status !== 'selected') ||
      (statusFilter === 'approved' && app.admin_approved && app.status !== 'rejected' && app.status !== 'selected' && app.status !== 'passed' && app.status !== 'failed' && !app.test_enabled) ||
      (statusFilter === 'test_enabled' && app.test_enabled) ||
      (statusFilter === 'passed' && app.status === 'passed') ||
      (statusFilter === 'failed' && app.status === 'failed') ||
      (statusFilter === 'selected' && app.status === 'selected') ||
      (statusFilter === 'rejected' && app.status === 'rejected');

    const matchesRound = 
      roundFilter === 'all' ||
      (roundFilter === 'round_1' && app.current_round === 1) ||
      (roundFilter === 'round_2' && app.current_round === 2) ||
      (roundFilter === 'round_3' && app.current_round === 3) ||
      (roundFilter === 'round_4' && app.current_round === 4) ||
      (roundFilter === 'round_5' && app.current_round === 5) ||
      (roundFilter === 'final' && app.current_round === app.jobs?.total_rounds);

    const matchesJob = 
      jobFilter === 'all' ||
      app.job_id === jobFilter;

    const matchesSlot = 
      slotFilter === 'all' ||
      slotFilter === 'no_slot' && !app.slot_id ||
      app.slot_id === slotFilter;

    return matchesSearch && matchesStatus && matchesRound && matchesJob && matchesSlot;
  });

  // Group applications by round
  const groupedByRound = groupByRound ? filteredApplications.reduce((acc, app) => {
    const round = app.current_round || 1;
    if (!acc[round]) {
      acc[round] = [];
    }
    acc[round].push(app);
    return acc;
  }, {} as Record<number, Application[]>) : null;

  // Get unique rounds for filter
  const availableRounds = Array.from(new Set(applications.map(app => app.current_round || 1))).sort((a, b) => a - b);

  // Get unique jobs for filter
  const availableJobs = Array.from(
    new Map(applications.map(app => [app.job_id, { id: app.job_id, title: app.jobs?.title || 'Unknown' }])).values()
  ).filter(job => job.id);

  // Get unique slots for filter
  const availableSlots = Array.from(
    new Map(
      applications
        .filter(app => app.slot_id && app.slots)
        .map(app => [
          app.slot_id!,
          {
            id: app.slot_id!,
            date: app.slots!.slot_date,
            start_time: app.slots!.start_time,
            end_time: app.slots!.end_time,
          }
        ])
    ).values()
  ).sort((a, b) => {
    // Sort by date, then by start time
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.start_time.localeCompare(b.start_time);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Application Management</h1>
          <p className="text-muted-foreground">Review and manage user applications</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
              <div className="xl:col-span-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-7 h-9 text-sm"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <Filter className="mr-1.5 h-3.5 w-3.5" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="test_enabled">Test Enabled</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="selected">Selected</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roundFilter} onValueChange={setRoundFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <Layers className="mr-1.5 h-3.5 w-3.5" />
                  <SelectValue placeholder="Round" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rounds</SelectItem>
                  {availableRounds.map(round => (
                    <SelectItem key={round} value={`round_${round}`}>
                      Round {round}
                    </SelectItem>
                  ))}
                  <SelectItem value="final">Final Round</SelectItem>
                </SelectContent>
              </Select>
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <Briefcase className="mr-1.5 h-3.5 w-3.5" />
                  <SelectValue placeholder="Job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  {availableJobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={slotFilter} onValueChange={setSlotFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
                  <SelectValue placeholder="Slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Slots</SelectItem>
                  <SelectItem value="no_slot">No Slot</SelectItem>
                  {availableSlots.map(slot => (
                    <SelectItem key={slot.id} value={slot.id}>
                      {format(new Date(slot.date), 'MMM dd')} - {slot.start_time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={groupByRound ? "default" : "outline"}
                onClick={() => setGroupByRound(!groupByRound)}
                className="h-9 text-sm"
                size="sm"
              >
                <Users className="mr-1.5 h-3.5 w-3.5" />
                {groupByRound ? 'Ungroup' : 'Group'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
            <CardDescription>
              {filteredApplications.length} of {applications.length} application(s)
              {groupByRound && groupedByRound && (
                <span className="ml-2">
                  • {Object.keys(groupedByRound).length} round(s)
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredApplications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No applications found</p>
              </div>
            ) : groupByRound && groupedByRound ? (
              // Grouped by Round View
              <div className="space-y-6">
                {Object.entries(groupedByRound)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([round, roundApps]) => (
                    <div key={round} className="space-y-3">
                      <div className="flex items-center gap-3 pb-2 border-b">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Layers className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">Round {round}</h3>
                          <p className="text-sm text-muted-foreground">
                            {roundApps.length} candidate{roundApps.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Applicant</TableHead>
                            <TableHead>Job</TableHead>
                            <TableHead>Slot</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Test</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {roundApps.map((app) => (
                            <TableRow key={app.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage
                                      src={avatarUrls.get(app.user_id) || app.profiles?.avatar_url || undefined}
                                      alt={app.profiles?.full_name || 'User'}
                                    />
                                    <AvatarFallback>
                                      {app.profiles?.full_name
                                        ? app.profiles.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                        : 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{app.profiles?.full_name || 'Unknown'}</p>
                                    <p className="text-sm text-muted-foreground">{app.profiles?.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{app.jobs?.title || 'Unknown'}</TableCell>
                              <TableCell>
                                {app.slots ? (
                                  <span className="text-sm">
                                    {format(new Date(app.slots.slot_date), 'MMM dd')} at {app.slots.start_time}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Not selected</span>
                                )}
                              </TableCell>
                              <TableCell>{getStatusBadge(app)}</TableCell>
                              <TableCell>
                                {app.admin_approved && app.status !== 'rejected' && app.status !== 'selected' && (
                                  <Switch
                                    checked={app.test_enabled ?? false}
                                    onCheckedChange={() => handleEnableTest(app)}
                                    disabled={actionLoading === app.id}
                                  />
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={actionLoading === app.id}>
                                      {actionLoading === app.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <MoreHorizontal className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {
                                      setSelectedApplication(app);
                                      setDetailsDialogOpen(true);
                                    }}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    {app.profiles?.resume_url && (
                                      <DropdownMenuItem onClick={() => handleViewResume(app.profiles!.resume_url!)}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        View Resume
                                      </DropdownMenuItem>
                                    )}
                                    {!app.admin_approved && app.status !== 'rejected' && (
                                      <>
                                        <DropdownMenuItem onClick={() => handleApprove(app)}>
                                          <CheckCircle className="mr-2 h-4 w-4 text-success" />
                                          Approve
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {app.admin_approved && app.status !== 'rejected' && app.status !== 'selected' && (
                                      <>
                                        <DropdownMenuItem onClick={() => handleUnapprove(app)}>
                                          <Ban className="mr-2 h-4 w-4 text-warning" />
                                          Un-approve
                                        </DropdownMenuItem>
                                        {app.status !== 'passed' && (
                                          <DropdownMenuItem onClick={() => handleMarkAsPassed(app)}>
                                            <UserCheck className="mr-2 h-4 w-4 text-success" />
                                            Mark as Passed
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={() => {
                                          setApplicationToEvaluate(app);
                                          setEvaluateDialogOpen(true);
                                        }}>
                                          <Star className="mr-2 h-4 w-4 text-primary" />
                                          Evaluate Candidate
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {app.admin_approved && app.status === 'passed' && (
                                      <DropdownMenuItem onClick={() => handleMoveToNextRound(app)}>
                                        <ArrowUpRight className="mr-2 h-4 w-4" />
                                        {(app.current_round || 1) >= (app.jobs?.total_rounds || 1) 
                                          ? 'Select Candidate' 
                                          : `Move to Round ${(app.current_round || 1) + 1}`}
                                      </DropdownMenuItem>
                                    )}
                                    {app.status !== 'rejected' && app.status !== 'selected' && (
                                      <DropdownMenuItem 
                                        onClick={() => handleReject(app)}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Reject
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setApplicationToChangeJob(app);
                                        setSelectedNewJobId(app.job_id);
                                        setChangeJobDialogOpen(true);
                                      }}
                                    >
                                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                                      Change Job
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setApplicationToDelete(app);
                                        setDeleteDialogOpen(true);
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Application
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
              </div>
            ) : (
              // Standard Table View
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Round</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={avatarUrls.get(app.user_id) || app.profiles?.avatar_url || undefined}
                              alt={app.profiles?.full_name || 'User'}
                            />
                            <AvatarFallback>
                              {app.profiles?.full_name
                                ? app.profiles.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{app.profiles?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{app.profiles?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{app.jobs?.title || 'Unknown'}</TableCell>
                      <TableCell>
                        {app.current_round} / {app.jobs?.total_rounds || 1}
                      </TableCell>
                      <TableCell>
                        {app.slots ? (
                          <span className="text-sm">
                            {format(new Date(app.slots.slot_date), 'MMM dd')} at {app.slots.start_time}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Not selected</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(app)}</TableCell>
                      <TableCell>
                        {app.admin_approved && app.status !== 'rejected' && app.status !== 'selected' && (
                          <Switch
                            checked={app.test_enabled ?? false}
                            onCheckedChange={() => handleEnableTest(app)}
                            disabled={actionLoading === app.id}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={actionLoading === app.id}>
                              {actionLoading === app.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedApplication(app);
                              setDetailsDialogOpen(true);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {app.profiles?.resume_url && (
                              <DropdownMenuItem onClick={() => handleViewResume(app.profiles!.resume_url!)}>
                                <FileText className="mr-2 h-4 w-4" />
                                View Resume
                              </DropdownMenuItem>
                            )}
                            {!app.admin_approved && app.status !== 'rejected' && (
                              <>
                                <DropdownMenuItem onClick={() => handleApprove(app)}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-success" />
                                  Approve
                                </DropdownMenuItem>
                              </>
                            )}
                            {app.admin_approved && app.status !== 'rejected' && app.status !== 'selected' && (
                              <>
                                <DropdownMenuItem onClick={() => handleUnapprove(app)}>
                                  <Ban className="mr-2 h-4 w-4 text-warning" />
                                  Un-approve
                                </DropdownMenuItem>
                                {app.status !== 'passed' && (
                                  <DropdownMenuItem onClick={() => handleMarkAsPassed(app)}>
                                    <UserCheck className="mr-2 h-4 w-4 text-success" />
                                    Mark as Passed
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => {
                                  setApplicationToEvaluate(app);
                                  setEvaluateDialogOpen(true);
                                }}>
                                  <Star className="mr-2 h-4 w-4 text-primary" />
                                  Evaluate Candidate
                                </DropdownMenuItem>
                              </>
                            )}
                            {app.admin_approved && app.status === 'passed' && (
                              <DropdownMenuItem onClick={() => handleMoveToNextRound(app)}>
                                <ArrowUpRight className="mr-2 h-4 w-4" />
                                {(app.current_round || 1) >= (app.jobs?.total_rounds || 1) 
                                  ? 'Select Candidate' 
                                  : `Move to Round ${(app.current_round || 1) + 1}`}
                              </DropdownMenuItem>
                            )}
                            {app.status !== 'rejected' && app.status !== 'selected' && (
                              <DropdownMenuItem 
                                onClick={() => handleReject(app)}
                                className="text-destructive focus:text-destructive"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => {
                                setApplicationToChangeJob(app);
                                setSelectedNewJobId(app.job_id);
                                setChangeJobDialogOpen(true);
                              }}
                            >
                              <ArrowRightLeft className="mr-2 h-4 w-4" />
                              Change Job
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setApplicationToDelete(app);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Application
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Full details for this application
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4">
              {/* Profile Header with Avatar */}
              <div className="flex items-start gap-4 pb-4 border-b">
                <Avatar className="h-20 w-20">
                  <AvatarImage 
                    src={avatarPublicUrl || selectedApplication.profiles?.avatar_url || undefined} 
                    alt={selectedApplication.profiles?.full_name || 'Profile'} 
                  />
                  <AvatarFallback className="text-lg">
                    {selectedApplication.profiles?.full_name 
                      ? selectedApplication.profiles.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{selectedApplication.profiles?.full_name || 'Unknown'}</h3>
                  <p className="text-sm text-muted-foreground">{selectedApplication.profiles?.email}</p>
                  {selectedApplication.profiles?.phone && (
                    <p className="text-sm text-muted-foreground">{selectedApplication.profiles.phone}</p>
                  )}
                  {selectedApplication.profiles?.resume_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleViewResume(selectedApplication.profiles!.resume_url!)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View Resume
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Job</Label>
                  <p className="font-medium">{selectedApplication.jobs?.title}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Current Round</Label>
                  <p className="font-medium">{selectedApplication.current_round} / {selectedApplication.jobs?.total_rounds || 1}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Applied On</Label>
                  <p className="font-medium">
                    {selectedApplication.created_at 
                      ? format(new Date(selectedApplication.created_at), 'MMM dd, yyyy')
                      : 'Unknown'}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">{getStatusBadge(selectedApplication)}</div>
              </div>
              {selectedApplication.slots && (
                <div>
                  <Label className="text-muted-foreground">Selected Slot</Label>
                  <p className="font-medium">
                    {format(new Date(selectedApplication.slots.slot_date), 'MMMM dd, yyyy')} at {selectedApplication.slots.start_time} - {selectedApplication.slots.end_time}
                  </p>
                </div>
              )}
              
              {/* Round Progress Tracker */}
              <div className="border-t pt-4 mt-4">
                <Label className="text-muted-foreground mb-3 block">Round Progress</Label>
                <div className="space-y-3">
                  {Array.from({ length: selectedApplication.jobs?.total_rounds || 1 }).map((_, index) => {
                    const roundNumber = index + 1;
                    const testAttempt = selectedApplication.test_attempts?.find(
                      t => t.round_number === roundNumber
                    );
                    const isCurrent = selectedApplication.current_round === roundNumber;
                    const isPast = (selectedApplication.current_round || 1) > roundNumber;
                    const isPassed = testAttempt?.is_passed === true;
                    const isFailed = testAttempt?.is_passed === false;
                    const isSubmitted = testAttempt?.is_submitted === true;
                    
                    return (
                      <div 
                        key={roundNumber} 
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isCurrent 
                            ? 'border-primary bg-primary/5' 
                            : isPast 
                              ? 'border-muted bg-muted/30' 
                              : 'border-muted-foreground/20 bg-muted/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                            isPassed 
                              ? 'bg-success text-success-foreground' 
                              : isFailed 
                                ? 'bg-destructive text-destructive-foreground'
                                : isCurrent 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-muted text-muted-foreground'
                          }`}>
                            {isPassed ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : isFailed ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              roundNumber
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">Round {roundNumber}</p>
                            {testAttempt && isSubmitted && (
                              <p className="text-xs text-muted-foreground">
                                Score: {testAttempt.obtained_marks || 0}/{testAttempt.total_marks || 0}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {isPassed && (
                            <Badge className="bg-success/20 text-success border-success/30">Passed</Badge>
                          )}
                          {isFailed && (
                            <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">Failed</Badge>
                          )}
                          {isCurrent && !isSubmitted && (
                            <Badge variant="outline" className="text-primary border-primary">Current</Badge>
                          )}
                          {isCurrent && isSubmitted && !isPassed && !isFailed && (
                            <Badge variant="outline" className="text-warning border-warning">Awaiting Review</Badge>
                          )}
                          {!isCurrent && !isPast && (
                            <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the application for {applicationToDelete?.profiles?.full_name || 'this candidate'}? 
              This will remove the application and all associated test attempts. The candidate will be able to apply again. 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteDialogOpen(false);
              setApplicationToDelete(null);
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={actionLoading === applicationToDelete?.id}
            >
              {actionLoading === applicationToDelete?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Job Dialog */}
      <Dialog open={changeJobDialogOpen} onOpenChange={setChangeJobDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Job</DialogTitle>
            <DialogDescription>
              Change the job for {applicationToChangeJob?.profiles?.full_name || 'this candidate'}. 
              Current job: {applicationToChangeJob?.jobs?.title || 'Unknown'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Select New Job</Label>
            <Select value={selectedNewJobId} onValueChange={setSelectedNewJobId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a job" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setChangeJobDialogOpen(false);
              setApplicationToChangeJob(null);
              setSelectedNewJobId('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleChangeJob} 
              disabled={actionLoading === applicationToChangeJob?.id || !selectedNewJobId || selectedNewJobId === applicationToChangeJob?.job_id}
            >
              {actionLoading === applicationToChangeJob?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evaluate Dialog */}
      <EvaluateDialog
        open={evaluateDialogOpen}
        onOpenChange={setEvaluateDialogOpen}
        application={applicationToEvaluate}
        onEvaluationComplete={() => {
          setApplicationToEvaluate(null);
          fetchApplications();
        }}
      />

      <Footer />
    </div>
  );
}
