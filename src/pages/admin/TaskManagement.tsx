import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
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
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  ClipboardList, 
  Loader2, 
  Shuffle,
  Users,
  Clock,
  FileText,
  Eye,
  Edit3
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Job {
  id: string;
  title: string;
  is_active: boolean | null;
}

interface JobTask {
  id: string;
  job_id: string;
  title: string;
  description: string;
  instructions: string | null;
  estimated_hours: number | null;
  is_active: boolean;
  created_at: string;
  jobs?: { title: string };
}

interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: string | null;
  profile?: { full_name: string | null; email: string | null } | null;
}

interface TaskFormData {
  job_id: string;
  title: string;
  description: string;
  instructions: string;
  estimated_hours: number;
  is_active: boolean;
}

const defaultFormData: TaskFormData = {
  job_id: '',
  title: '',
  description: '',
  instructions: '',
  estimated_hours: 4,
  is_active: true,
};

export default function TaskManagement() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tasks, setTasks] = useState<JobTask[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<JobTask | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('all');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [assignMode, setAssignMode] = useState<'manual' | 'random'>('manual');
  const [randomCount, setRandomCount] = useState(5);
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jobsRes, tasksRes] = await Promise.all([
        supabase.from('jobs').select('id, title, is_active').order('title'),
        supabase.from('job_tasks').select('*, jobs(title)').order('created_at', { ascending: false }),
      ]);

      if (jobsRes.error) throw jobsRes.error;
      if (tasksRes.error) throw tasksRes.error;

      setJobs(jobsRes.data || []);
      setTasks(tasksRes.data || []);
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

  const fetchCandidatesForJob = async (jobId: string) => {
    // First fetch applications
    const { data: appsData, error: appsError } = await supabase
      .from('applications')
      .select('id, user_id, job_id, status')
      .eq('job_id', jobId)
      .in('status', ['applied', 'shortlisted', 'round_1', 'round_2', 'round_3']);

    if (appsError) {
      toast({ title: 'Error', description: appsError.message, variant: 'destructive' });
      return;
    }

    if (!appsData || appsData.length === 0) {
      setApplications([]);
      return;
    }

    // Fetch profiles for these users
    const userIds = appsData.map(a => a.user_id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', userIds);

    // Merge profiles with applications
    const appsWithProfiles: Application[] = appsData.map(app => ({
      ...app,
      profile: profilesData?.find(p => p.user_id === app.user_id) || null,
    }));

    setApplications(appsWithProfiles);
  };

  const handleOpenDialog = (task?: JobTask) => {
    if (task) {
      setSelectedTask(task);
      setFormData({
        job_id: task.job_id,
        title: task.title,
        description: task.description,
        instructions: task.instructions || '',
        estimated_hours: task.estimated_hours || 4,
        is_active: task.is_active,
      });
    } else {
      setSelectedTask(null);
      setFormData(defaultFormData);
    }
    setPreviewMode(false);
    setDialogOpen(true);
  };

  const handleOpenAssignDialog = async (task: JobTask) => {
    setSelectedTask(task);
    setSelectedCandidates([]);
    setAssignMode('manual');
    await fetchCandidatesForJob(task.job_id);
    setAssignDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (selectedTask) {
        const { error } = await supabase
          .from('job_tasks')
          .update({
            job_id: formData.job_id,
            title: formData.title,
            description: formData.description,
            instructions: formData.instructions,
            estimated_hours: formData.estimated_hours,
            is_active: formData.is_active,
          })
          .eq('id', selectedTask.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Task updated successfully' });
      } else {
        const { error } = await supabase
          .from('job_tasks')
          .insert({
            job_id: formData.job_id,
            title: formData.title,
            description: formData.description,
            instructions: formData.instructions,
            estimated_hours: formData.estimated_hours,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Task created successfully' });
      }

      setDialogOpen(false);
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

  const handleDelete = async () => {
    if (!selectedTask) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('job_tasks')
        .delete()
        .eq('id', selectedTask.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Task deleted successfully' });
      setDeleteDialogOpen(false);
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

  const handleAssignTasks = async () => {
    if (!selectedTask) return;
    setSubmitting(true);

    try {
      let candidatesToAssign = selectedCandidates;

      if (assignMode === 'random') {
        // Randomly select candidates
        const shuffled = [...applications].sort(() => Math.random() - 0.5);
        candidatesToAssign = shuffled.slice(0, Math.min(randomCount, shuffled.length)).map(a => a.id);
      }

      if (candidatesToAssign.length === 0) {
        toast({ title: 'Warning', description: 'No candidates selected', variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      // Create task assignments
      const assignments = candidatesToAssign.map(applicationId => ({
        task_id: selectedTask.id,
        application_id: applicationId,
        status: 'pending',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      }));

      const { error } = await supabase
        .from('task_assignments')
        .upsert(assignments, { onConflict: 'task_id,application_id' });

      if (error) throw error;

      toast({ 
        title: 'Success', 
        description: `Task assigned to ${candidatesToAssign.length} candidate(s)` 
      });
      setAssignDialogOpen(false);
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

  const toggleTaskStatus = async (task: JobTask) => {
    try {
      const { error } = await supabase
        .from('job_tasks')
        .update({ is_active: !task.is_active })
        .eq('id', task.id);

      if (error) throw error;
      fetchData();
      toast({
        title: 'Success',
        description: `Task ${!task.is_active ? 'activated' : 'deactivated'}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredTasks = selectedJobFilter === 'all' 
    ? tasks 
    : tasks.filter(t => t.job_id === selectedJobFilter);

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Task Management</h1>
            <p className="text-muted-foreground">Create tasks and assign them to candidates</p>
          </div>
          <div className="flex items-center gap-3">
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
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" /> Create Task
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Tasks</CardTitle>
            <CardDescription>{filteredTasks.length} task(s) created</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No tasks created yet</p>
                <Button className="mt-4" onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" /> Create Your First Task
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Est. Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {task.description.substring(0, 80)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{task.jobs?.title || '-'}</Badge>
                      </TableCell>
                      <TableCell>
                        {task.estimated_hours ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3" />
                            {task.estimated_hours}h
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={task.is_active ? 'default' : 'secondary'}>
                          {task.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAssignDialog(task)}
                          >
                            <Shuffle className="h-4 w-4 mr-1" />
                            Assign
                          </Button>
                          <Switch
                            checked={task.is_active}
                            onCheckedChange={() => toggleTaskStatus(task)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(task)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedTask(task);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create/Edit Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>{selectedTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
                  <DialogDescription>
                    {selectedTask ? 'Update task details' : 'Create a task with rich description to assign to candidates'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Edit/Preview Toggle */}
            <Tabs value={previewMode ? 'preview' : 'edit'} onValueChange={(v) => setPreviewMode(v === 'preview')} className="mt-4">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="edit" className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="mt-0">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="job">Job *</Label>
                    <Select
                      value={formData.job_id}
                      onValueChange={(value) => setFormData({ ...formData, job_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a job" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.map(job => (
                          <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Task Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Create Landing Page from Figma Design"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimated_hours">Estimated Hours</Label>
                    <Input
                      id="estimated_hours"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.estimated_hours}
                      onChange={(e) => setFormData({ ...formData, estimated_hours: parseInt(e.target.value) || 4 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">
                      Task Description * <span className="text-xs text-muted-foreground">(Format text, add links & images)</span>
                    </Label>
                    <RichTextEditor
                      value={formData.description}
                      onChange={(value) => setFormData({ ...formData, description: value })}
                      placeholder="Describe the task requirements, add Figma links, reference images..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions">Additional Instructions (Optional)</Label>
                    <RichTextEditor
                      value={formData.instructions}
                      onChange={(value) => setFormData({ ...formData, instructions: value })}
                      placeholder="Any additional notes, resources, or guidance..."
                      className="min-h-[120px]"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active (can be assigned)</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-0">
                <div className="border rounded-lg bg-muted/30 p-6 space-y-6">
                  {/* Preview Header */}
                  <div className="border-b pb-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Task Preview - What candidates will see
                    </p>
                    <h2 className="text-2xl font-bold text-foreground">
                      {formData.title || 'Task Title'}
                    </h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {jobs.find(j => j.id === formData.job_id)?.title || 'No job selected'}
                      </span>
                      {formData.estimated_hours > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Est. {formData.estimated_hours} hours
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description Preview */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Task Description
                    </h3>
                    {formData.description ? (
                      <div 
                        className="prose prose-sm dark:prose-invert max-w-none bg-background p-4 rounded-lg border"
                        dangerouslySetInnerHTML={{ __html: formData.description }}
                      />
                    ) : (
                      <p className="text-muted-foreground italic p-4 bg-background rounded-lg border">
                        No description provided yet
                      </p>
                    )}
                  </div>

                  {/* Instructions Preview */}
                  {formData.instructions && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Additional Instructions
                      </h3>
                      <div 
                        className="prose prose-sm dark:prose-invert max-w-none bg-background p-4 rounded-lg border"
                        dangerouslySetInnerHTML={{ __html: formData.instructions }}
                      />
                    </div>
                  )}

                  {/* Status Preview */}
                  <div className="pt-4 border-t">
                    <Badge variant={formData.is_active ? 'default' : 'secondary'}>
                      {formData.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !formData.job_id}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedTask ? 'Update Task' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Task Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Task</DialogTitle>
            <DialogDescription>
              Assign "{selectedTask?.title}" to candidates
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-4">
              <Button
                type="button"
                variant={assignMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setAssignMode('manual')}
                className="flex-1"
              >
                <Users className="h-4 w-4 mr-2" />
                Manual Selection
              </Button>
              <Button
                type="button"
                variant={assignMode === 'random' ? 'default' : 'outline'}
                onClick={() => setAssignMode('random')}
                className="flex-1"
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Random Assignment
              </Button>
            </div>

            {assignMode === 'random' ? (
              <div className="space-y-3">
                <Label>Number of candidates to randomly assign</Label>
                <Input
                  type="number"
                  min="1"
                  max={applications.length}
                  value={randomCount}
                  onChange={(e) => setRandomCount(parseInt(e.target.value) || 1)}
                />
                <p className="text-sm text-muted-foreground">
                  {applications.length} eligible candidate(s) available
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Label>Select candidates ({selectedCandidates.length} selected)</Label>
                <div className="max-h-[300px] overflow-y-auto border rounded-md divide-y">
                  {applications.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">
                      No eligible candidates for this job
                    </p>
                  ) : (
                    applications.map((app) => (
                      <label
                        key={app.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCandidates.includes(app.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCandidates([...selectedCandidates, app.id]);
                            } else {
                              setSelectedCandidates(selectedCandidates.filter(id => id !== app.id));
                            }
                          }}
                          className="rounded border-input"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {app.profile?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {app.profile?.email}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {app.status}
                        </Badge>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignTasks} 
              disabled={submitting || (assignMode === 'manual' && selectedCandidates.length === 0)}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTask?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
