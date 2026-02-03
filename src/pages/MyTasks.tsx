import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
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
import { useToast } from '@/hooks/use-toast';
import { 
  ClipboardList, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Send,
  Calendar,
  Briefcase,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';

interface TaskAssignment {
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
  job_tasks: {
    id: string;
    title: string;
    description: string;
    instructions: string | null;
    estimated_hours: number | null;
    jobs: {
      id: string;
      title: string;
      department: string | null;
    };
  };
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: AlertCircle },
  submitted: { label: 'Submitted', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  reviewed: { label: 'Reviewed', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: CheckCircle2 },
};

export default function MyTasks() {
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskAssignment | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      // First get user's applications
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select('id')
        .eq('user_id', user!.id);

      if (appsError) throw appsError;

      if (!appsData || appsData.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }

      const applicationIds = appsData.map(a => a.id);

      // Fetch task assignments for these applications
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('task_assignments')
        .select('*')
        .in('application_id', applicationIds)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      if (!assignmentsData || assignmentsData.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }

      // Fetch task details
      const taskIds = [...new Set(assignmentsData.map(a => a.task_id))];
      const { data: tasksData, error: tasksError } = await supabase
        .from('job_tasks')
        .select('id, title, description, instructions, estimated_hours, job_id')
        .in('id', taskIds);

      if (tasksError) throw tasksError;

      // Fetch job details
      const jobIds = [...new Set((tasksData || []).map(t => t.job_id))];
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('id, title, department')
        .in('id', jobIds);

      // Merge data
      const mergedTasks: TaskAssignment[] = assignmentsData.map(assignment => {
        const task = tasksData?.find(t => t.id === assignment.task_id);
        const job = jobsData?.find(j => j.id === task?.job_id);
        return {
          ...assignment,
          job_tasks: {
            id: task?.id || '',
            title: task?.title || 'Unknown Task',
            description: task?.description || '',
            instructions: task?.instructions || null,
            estimated_hours: task?.estimated_hours || null,
            jobs: {
              id: job?.id || '',
              title: job?.title || 'Unknown Job',
              department: job?.department || null,
            },
          },
        };
      });

      setTasks(mergedTasks);
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

  const handleOpenSubmitDialog = (task: TaskAssignment) => {
    setSelectedTask(task);
    setSubmissionUrl(task.submission_url || '');
    setSubmissionNotes(task.submission_notes || '');
    setSubmitDialogOpen(true);
  };

  const handleViewTask = (task: TaskAssignment) => {
    setSelectedTask(task);
    setViewDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedTask || !submissionUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a submission URL',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('task_assignments')
        .update({
          submission_url: submissionUrl.trim(),
          submission_notes: submissionNotes.trim() || null,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', selectedTask.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Your work has been submitted successfully!',
      });

      setSubmitDialogOpen(false);
      fetchTasks();
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

  const handleMarkInProgress = async (task: TaskAssignment) => {
    try {
      const { error } = await supabase
        .from('task_assignments')
        .update({ status: 'in_progress' })
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: 'Task marked as in progress',
      });

      fetchTasks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const submittedTasks = tasks.filter(t => t.status === 'submitted' || t.status === 'reviewed');

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="sm" asChild className="p-0 h-auto">
                <Link to="/dashboard" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
            <p className="text-muted-foreground">View and submit your assigned tasks</p>
          </div>
        </div>

        {tasks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Tasks Assigned</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any tasks assigned yet. Tasks will appear here once assigned by the hiring team.
              </p>
              <Button asChild variant="outline">
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  Pending Tasks ({pendingTasks.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {pendingTasks.map((task) => {
                    const status = statusConfig[task.status || 'pending'];
                    const StatusIcon = status.icon;
                    const isOverdue = task.due_date && isPast(new Date(task.due_date));

                    return (
                      <Card key={task.id} className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-red-300' : ''}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <CardTitle className="text-lg line-clamp-1">
                                {task.job_tasks.title}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-1 mt-1">
                                <Briefcase className="h-3 w-3" />
                                {task.job_tasks.jobs.title}
                                {task.job_tasks.jobs.department && (
                                  <span className="text-xs">• {task.job_tasks.jobs.department}</span>
                                )}
                              </CardDescription>
                            </div>
                            <Badge className={`${status.color} border`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Due Date */}
                          {task.due_date && (
                            <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                              <Calendar className="h-4 w-4" />
                              <span>
                                Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                                {isOverdue ? ' (Overdue)' : ` (${formatDistanceToNow(new Date(task.due_date), { addSuffix: true })})`}
                              </span>
                            </div>
                          )}

                          {/* Estimated Time */}
                          {task.job_tasks.estimated_hours && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>Estimated: {task.job_tasks.estimated_hours} hours</span>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewTask(task)}
                              className="flex-1"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            {task.status === 'pending' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleMarkInProgress(task)}
                              >
                                Start Task
                              </Button>
                            )}
                            {task.status === 'in_progress' && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenSubmitDialog(task)}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Submit
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submitted Tasks */}
            {submittedTasks.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Submitted Tasks ({submittedTasks.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {submittedTasks.map((task) => {
                    const status = statusConfig[task.status || 'submitted'];
                    const StatusIcon = status.icon;

                    return (
                      <Card key={task.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <CardTitle className="text-lg line-clamp-1">
                                {task.job_tasks.title}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-1 mt-1">
                                <Briefcase className="h-3 w-3" />
                                {task.job_tasks.jobs.title}
                              </CardDescription>
                            </div>
                            <Badge className={`${status.color} border`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Submission Info */}
                          {task.submitted_at && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span>Submitted: {format(new Date(task.submitted_at), 'MMM d, yyyy h:mm a')}</span>
                            </div>
                          )}

                          {/* Score if reviewed */}
                          {task.status === 'reviewed' && task.score !== null && (
                            <div className="p-3 bg-muted rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Score</span>
                                <span className="text-lg font-bold text-primary">{task.score}/100</span>
                              </div>
                              {task.reviewer_notes && (
                                <p className="text-sm text-muted-foreground">{task.reviewer_notes}</p>
                              )}
                            </div>
                          )}

                          {/* Submission URL */}
                          {task.submission_url && (
                            <a
                              href={task.submission_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View Submission
                            </a>
                          )}

                          {/* View Details Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewTask(task)}
                            className="w-full"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* View Task Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.job_tasks.title}</DialogTitle>
            <DialogDescription>
              {selectedTask?.job_tasks.jobs.title}
              {selectedTask?.job_tasks.jobs.department && ` • ${selectedTask?.job_tasks.jobs.department}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Task Description */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Task Description</Label>
              <div 
                className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted/50 rounded-lg border"
                dangerouslySetInnerHTML={{ __html: selectedTask?.job_tasks.description || '' }}
              />
            </div>

            {/* Instructions */}
            {selectedTask?.job_tasks.instructions && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Additional Instructions</Label>
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted/50 rounded-lg border"
                  dangerouslySetInnerHTML={{ __html: selectedTask.job_tasks.instructions }}
                />
              </div>
            )}

            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {selectedTask?.job_tasks.estimated_hours && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Estimated: {selectedTask.job_tasks.estimated_hours} hours</span>
                </div>
              )}
              {selectedTask?.due_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Due: {format(new Date(selectedTask.due_date), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>

            {/* Submission Section */}
            {selectedTask?.status === 'submitted' || selectedTask?.status === 'reviewed' ? (
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Your Submission</h4>
                {selectedTask.submission_url && (
                  <a
                    href={selectedTask.submission_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline mb-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {selectedTask.submission_url}
                  </a>
                )}
                {selectedTask.submission_notes && (
                  <p className="text-sm text-muted-foreground">{selectedTask.submission_notes}</p>
                )}
              </div>
            ) : (
              selectedTask?.status === 'in_progress' && (
                <Button onClick={() => {
                  setViewDialogOpen(false);
                  handleOpenSubmitDialog(selectedTask);
                }} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Submit Your Work
                </Button>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Work Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Your Work</DialogTitle>
            <DialogDescription>
              Submit your completed work for "{selectedTask?.job_tasks.title}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="submission-url">Submission URL *</Label>
              <Input
                id="submission-url"
                value={submissionUrl}
                onChange={(e) => setSubmissionUrl(e.target.value)}
                placeholder="https://github.com/your-username/project or deployed URL"
              />
              <p className="text-xs text-muted-foreground">
                Provide a link to your GitHub repo, deployed site, or any other relevant URL
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="submission-notes">Notes (Optional)</Label>
              <Textarea
                id="submission-notes"
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                placeholder="Any additional notes about your submission, challenges faced, or things to highlight..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !submissionUrl.trim()}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Work
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
