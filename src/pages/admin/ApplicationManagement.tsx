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
  Users
} from 'lucide-react';
import { format } from 'date-fns';

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
}

export default function ApplicationManagement() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roundFilter, setRoundFilter] = useState<string>('all');
  const [groupByRound, setGroupByRound] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState<Application | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();
  }, []);

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
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone, resume_url')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      
      const enrichedApps = (appsData || []).map(app => ({
        ...app,
        profiles: profilesMap.get(app.user_id) || null
      }));

      setApplications(enrichedApps as Application[]);
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

  const handleDelete = async () => {
    if (!applicationToDelete) return;

    setActionLoading(applicationToDelete.id);
    try {
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
      // Generate a signed URL for the resume (valid for 1 hour)
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
      (statusFilter === 'pending' && !app.admin_approved && app.status === 'applied') ||
      (statusFilter === 'approved' && app.admin_approved && app.status === 'applied') ||
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

    return matchesSearch && matchesStatus && matchesRound;
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
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or job title..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by status" />
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
                  <SelectTrigger className="w-[180px]">
                    <Layers className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filter by round" />
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
                <Button
                  variant={groupByRound ? "default" : "outline"}
                  onClick={() => setGroupByRound(!groupByRound)}
                  className="w-[180px]"
                >
                  <Users className="mr-2 h-4 w-4" />
                  {groupByRound ? 'Ungroup' : 'Group by Round'}
                </Button>
              </div>
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
                                <div>
                                  <p className="font-medium">{app.profiles?.full_name || 'Unknown'}</p>
                                  <p className="text-sm text-muted-foreground">{app.profiles?.email}</p>
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
                                        <DropdownMenuItem onClick={() => handleReject(app)}>
                                          <XCircle className="mr-2 h-4 w-4 text-destructive" />
                                          Reject
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {app.admin_approved && app.status !== 'rejected' && app.status !== 'selected' && app.status !== 'passed' && (
                                      <DropdownMenuItem onClick={() => handleMarkAsPassed(app)}>
                                        <UserCheck className="mr-2 h-4 w-4 text-success" />
                                        Mark as Passed
                                      </DropdownMenuItem>
                                    )}
                                    {app.admin_approved && app.status === 'passed' && (
                                      <DropdownMenuItem onClick={() => handleMoveToNextRound(app)}>
                                        <ArrowUpRight className="mr-2 h-4 w-4" />
                                        {(app.current_round || 1) >= (app.jobs?.total_rounds || 1) 
                                          ? 'Select Candidate' 
                                          : `Move to Round ${(app.current_round || 1) + 1}`}
                                      </DropdownMenuItem>
                                    )}
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
                        <div>
                          <p className="font-medium">{app.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{app.profiles?.email}</p>
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
                                <DropdownMenuItem onClick={() => handleReject(app)}>
                                  <XCircle className="mr-2 h-4 w-4 text-destructive" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {app.admin_approved && app.status !== 'rejected' && app.status !== 'selected' && app.status !== 'passed' && (
                              <DropdownMenuItem onClick={() => handleMarkAsPassed(app)}>
                                <UserCheck className="mr-2 h-4 w-4 text-success" />
                                Mark as Passed
                              </DropdownMenuItem>
                            )}
                            {app.admin_approved && app.status === 'passed' && (
                              <DropdownMenuItem onClick={() => handleMoveToNextRound(app)}>
                                <ArrowUpRight className="mr-2 h-4 w-4" />
                                {(app.current_round || 1) >= (app.jobs?.total_rounds || 1) 
                                  ? 'Select Candidate' 
                                  : `Move to Round ${(app.current_round || 1) + 1}`}
                              </DropdownMenuItem>
                            )}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Full details for this application
            </DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Applicant</Label>
                  <p className="font-medium">{selectedApplication.profiles?.full_name || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedApplication.profiles?.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedApplication.profiles?.phone || 'N/A'}</p>
                </div>
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

      <Footer />
    </div>
  );
}
