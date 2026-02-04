import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  ClipboardCheck, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  ExternalLink,
  Star,
  User,
  Calendar,
  FileText,
  AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface TaskSubmission {
  id: string;
  task_id: string;
  application_id: string;
  status: string | null;
  assigned_at: string;
  due_date: string | null;
  submission_url: string | null;
  submission_notes: string | null;
  submitted_at: string | null;
  score: number | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  task_title: string;
  job_title: string;
  candidate_name: string | null;
  candidate_email: string | null;
}

interface Job {
  id: string;
  title: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: AlertCircle },
  submitted: { label: 'Submitted', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  reviewed: { label: 'Reviewed', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Star },
};

export default function TaskSubmissions() {
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [score, setScore] = useState<number>(0);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('submitted');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title')
        .order('title');

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);

      // Fetch task assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('task_assignments')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      if (!assignmentsData || assignmentsData.length === 0) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      // Fetch task details
      const taskIds = [...new Set(assignmentsData.map(a => a.task_id))];
      const { data: tasksData } = await supabase
        .from('job_tasks')
        .select('id, title, job_id')
        .in('id', taskIds);

      // Fetch job details for tasks
      const jobIds = [...new Set((tasksData || []).map(t => t.job_id))];
      const { data: taskJobsData } = await supabase
        .from('jobs')
        .select('id, title')
        .in('id', jobIds);

      // Fetch applications
      const applicationIds = [...new Set(assignmentsData.map(a => a.application_id))];
      const { data: appsData } = await supabase
        .from('applications')
        .select('id, user_id')
        .in('id', applicationIds);

      // Fetch profiles
      const userIds = [...new Set((appsData || []).map(a => a.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      // Merge all data
      const mergedSubmissions: TaskSubmission[] = assignmentsData.map(assignment => {
        const task = tasksData?.find(t => t.id === assignment.task_id);
        const job = taskJobsData?.find(j => j.id === task?.job_id);
        const app = appsData?.find(a => a.id === assignment.application_id);
        const profile = profilesData?.find(p => p.user_id === app?.user_id);

        return {
          ...assignment,
          task_title: task?.title || 'Unknown Task',
          job_title: job?.title || 'Unknown Job',
          candidate_name: profile?.full_name || null,
          candidate_email: profile?.email || null,
        };
      });

      setSubmissions(mergedSubmissions);
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

  const handleOpenReviewDialog = (submission: TaskSubmission) => {
    setSelectedSubmission(submission);
    setScore(submission.score || 0);
    setReviewerNotes(submission.reviewer_notes || '');
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedSubmission) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('task_assignments')
        .update({
          score,
          reviewer_notes: reviewerNotes.trim() || null,
          status: 'reviewed',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Review submitted successfully',
      });

      setReviewDialogOpen(false);
      fetchData();
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

  // Filter submissions
  const filteredSubmissions = submissions.filter(s => {
    const jobMatch = selectedJobFilter === 'all' || 
      submissions.find(sub => sub.id === s.id && sub.job_title === jobs.find(j => j.id === selectedJobFilter)?.title);
    const statusMatch = selectedStatusFilter === 'all' || s.status === selectedStatusFilter;
    return statusMatch && (selectedJobFilter === 'all' || s.job_title === jobs.find(j => j.id === selectedJobFilter)?.title);
  });

  const pendingCount = submissions.filter(s => s.status === 'pending' || s.status === 'in_progress').length;
  const submittedCount = submissions.filter(s => s.status === 'submitted').length;
  const reviewedCount = submissions.filter(s => s.status === 'reviewed').length;

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Task Submissions</h1>
            <p className="text-muted-foreground">Review and score candidate task submissions</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Awaiting Submission</CardDescription>
              <CardTitle className="text-2xl">{pendingCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Review</CardDescription>
              <CardTitle className="text-2xl text-primary">{submittedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Reviewed</CardDescription>
              <CardTitle className="text-2xl text-primary">{reviewedCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Select value={selectedJobFilter} onValueChange={setSelectedJobFilter}>
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

          <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Submissions</CardTitle>
            <CardDescription>{filteredSubmissions.length} submission(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No submissions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => {
                    const status = statusConfig[submission.status || 'pending'];
                    const StatusIcon = status.icon;

                    return (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{submission.candidate_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{submission.candidate_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{submission.task_title}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{submission.job_title}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status.color} border`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {submission.submitted_at ? (
                            <span className="text-sm">
                              {format(new Date(submission.submitted_at), 'MMM d, yyyy')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {submission.score !== null ? (
                            <span className="font-medium">{submission.score}/100</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {submission.submission_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <a
                                  href={submission.submission_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {(submission.status === 'submitted' || submission.status === 'reviewed') && (
                              <Button
                                variant={submission.status === 'submitted' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleOpenReviewDialog(submission)}
                              >
                                {submission.status === 'submitted' ? 'Review' : 'Edit Review'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
            <DialogDescription>
              Review submission from {selectedSubmission?.candidate_name || 'Unknown'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Submission Details */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedSubmission?.task_title}</span>
              </div>
              
              {selectedSubmission?.submission_url && (
                <a
                  href={selectedSubmission.submission_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Submission
                </a>
              )}

              {selectedSubmission?.submission_notes && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Candidate Notes:</p>
                  <p className="text-sm mt-1">{selectedSubmission.submission_notes}</p>
                </div>
              )}

              {selectedSubmission?.submitted_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Submitted {formatDistanceToNow(new Date(selectedSubmission.submitted_at), { addSuffix: true })}
                </div>
              )}
            </div>

            {/* Score Input */}
            <div className="space-y-2">
              <Label htmlFor="score">Score (0-100)</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              />
            </div>

            {/* Reviewer Notes */}
            <div className="space-y-2">
              <Label htmlFor="reviewer-notes">Review Notes (Optional)</Label>
              <Textarea
                id="reviewer-notes"
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Feedback for the candidate, areas of improvement, strengths..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReview} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>
    </AdminLayout>
  );
}
