import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Briefcase, MapPin, DollarSign, Loader2 } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  location: string | null;
  salary_range: string | null;
  requirements: string | null;
  total_rounds: number | null;
  question_count: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface JobRound {
  id?: string;
  job_id?: string;
  round_number: number;
  name: string;
  description: string;
}

interface JobFormData {
  title: string;
  description: string;
  department: string;
  location: string;
  salary_range: string;
  requirements: string;
  total_rounds: number;
  question_count: number;
  is_active: boolean;
}

const defaultFormData: JobFormData = {
  title: '',
  description: '',
  department: '',
  location: '',
  salary_range: '',
  requirements: '',
  total_rounds: 1,
  question_count: 10,
  is_active: true,
};

export default function JobManagement() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState<JobFormData>(defaultFormData);
  const [jobRounds, setJobRounds] = useState<JobRound[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
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

  const handleOpenDialog = (job?: Job) => {
    if (job) {
      setSelectedJob(job);
      setFormData({
        title: job.title,
        description: job.description || '',
        department: job.department || '',
        location: job.location || '',
        salary_range: job.salary_range || '',
        requirements: job.requirements || '',
        total_rounds: job.total_rounds || 1,
        question_count: job.question_count || 10,
        is_active: job.is_active ?? true,
      });

      // Load existing rounds for this job
      supabase
        .from('job_rounds')
        .select('id, job_id, round_number, name, description')
        .eq('job_id', job.id)
        .order('round_number', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) {
            setJobRounds(
              data.map((r) => ({
                id: r.id,
                job_id: r.job_id,
                round_number: r.round_number,
                name: r.name,
                description: r.description || '',
              }))
            );
          }
        });
    } else {
      setSelectedJob(null);
      setFormData(defaultFormData);
      setJobRounds([]);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (selectedJob) {
        // Update existing job
        const { error } = await supabase
          .from('jobs')
          .update({
            title: formData.title,
            description: formData.description,
            department: formData.department,
            location: formData.location,
            salary_range: formData.salary_range,
            requirements: formData.requirements,
            total_rounds: formData.total_rounds,
            question_count: formData.question_count,
            is_active: formData.is_active,
          })
          .eq('id', selectedJob.id);

        if (error) throw error;

        // Replace rounds for this job
        await supabase.from('job_rounds').delete().eq('job_id', selectedJob.id);
        if (jobRounds.length > 0) {
          await supabase.from('job_rounds').insert(
            jobRounds.map((r) => ({
              job_id: selectedJob.id,
              round_number: r.round_number,
              name: r.name,
              description: r.description,
            }))
          );
        }
        toast({ title: 'Success', description: 'Job updated successfully' });
      } else {
        // Create new job
        const { data, error } = await supabase
          .from('jobs')
          .insert({
            title: formData.title,
            description: formData.description,
            department: formData.department,
            location: formData.location,
            salary_range: formData.salary_range,
            requirements: formData.requirements,
            total_rounds: formData.total_rounds,
            question_count: formData.question_count,
            is_active: formData.is_active,
          })
          .select('id')
          .single();

        if (error) throw error;

        const newJobId = data.id;
        if (jobRounds.length > 0) {
          await supabase.from('job_rounds').insert(
            jobRounds.map((r) => ({
              job_id: newJobId,
              round_number: r.round_number,
              name: r.name,
              description: r.description,
            }))
          );
        }
        toast({ title: 'Success', description: 'Job created successfully' });
      }

      setDialogOpen(false);
      fetchJobs();
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
    if (!selectedJob) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', selectedJob.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Job deleted successfully' });
      setDeleteDialogOpen(false);
      fetchJobs();
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

  const toggleJobStatus = async (job: Job) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ is_active: !job.is_active })
        .eq('id', job.id);

      if (error) throw error;
      fetchJobs();
      toast({
        title: 'Success',
        description: `Job ${!job.is_active ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Management</h1>
            <p className="text-muted-foreground">Create and manage job openings</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" /> Create Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{selectedJob ? 'Edit Job' : 'Create New Job'}</DialogTitle>
                  <DialogDescription>
                    {selectedJob ? 'Update job details' : 'Fill in the details to create a new job opening'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Software Engineer"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        placeholder="e.g., Engineering"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g., Remote, New York"
                      />
                    </div>
                  </div>

                  {/* Interview Rounds Definition */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Interview Rounds</Label>
                        <p className="text-xs text-muted-foreground">
                          Define each round for this job (e.g. Screening, Technical, HR).
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const nextRound =
                            jobRounds.length > 0
                              ? Math.max(...jobRounds.map((r) => r.round_number)) + 1
                              : 1;
                          setJobRounds([
                            ...jobRounds,
                            { round_number: nextRound, name: `Round ${nextRound}`, description: '' },
                          ]);
                        }}
                      >
                        <Plus className="mr-1 h-3 w-3" /> Add Round
                      </Button>
                    </div>

                    {jobRounds.length > 0 ? (
                      <div className="space-y-3">
                        {jobRounds
                          .slice()
                          .sort((a, b) => a.round_number - b.round_number)
                          .map((round, idx) => (
                            <div
                              key={`${round.round_number}-${idx}`}
                              className="grid grid-cols-1 md:grid-cols-[80px,1fr,auto] gap-3 items-start p-3 rounded-md border bg-muted/40"
                            >
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Round #</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={round.round_number}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 1;
                                    setJobRounds((prev) =>
                                      prev.map((r, i) =>
                                        i === idx ? { ...r, round_number: value } : r
                                      )
                                    );
                                  }}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Name</Label>
                                <Input
                                  value={round.name}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setJobRounds((prev) =>
                                      prev.map((r, i) =>
                                        i === idx ? { ...r, name: value } : r
                                      )
                                    );
                                  }}
                                  placeholder="e.g., Screening, Technical Interview, HR Round"
                                />
                                <Textarea
                                  className="mt-2"
                                  rows={2}
                                  value={round.description}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    setJobRounds((prev) =>
                                      prev.map((r, i) =>
                                        i === idx ? { ...r, description: value } : r
                                      )
                                    );
                                  }}
                                  placeholder="Short description of what is evaluated in this round"
                                />
                              </div>
                              <div className="flex md:flex-col gap-2 justify-between md:justify-start md:items-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setJobRounds((prev) => prev.filter((_, i) => i !== idx));
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="salary_range">Salary Range</Label>
                      <Input
                        id="salary_range"
                        value={formData.salary_range}
                        onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                        placeholder="e.g., $80,000 - $120,000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="total_rounds">Total Rounds</Label>
                      <Input
                        id="total_rounds"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.total_rounds}
                        onChange={(e) => setFormData({ ...formData, total_rounds: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="question_count">Number of Questions to Display</Label>
                    <Input
                      id="question_count"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.question_count}
                      onChange={(e) => setFormData({ ...formData, question_count: parseInt(e.target.value) || 10 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Questions will be randomly selected from the pool during the test.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Job description..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requirements">Requirements</Label>
                    <Textarea
                      id="requirements"
                      value={formData.requirements}
                      onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                      placeholder="Job requirements..."
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active (visible to applicants)</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedJob ? 'Update Job' : 'Create Job'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Jobs</CardTitle>
            <CardDescription>{jobs.length} job(s) created</CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No jobs created yet</p>
                <Button className="mt-4" onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" /> Create Your First Job
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Rounds</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>{job.department || '-'}</TableCell>
                      <TableCell>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </span>
                        )}
                        {!job.location && '-'}
                      </TableCell>
                      <TableCell>{job.total_rounds || 1}</TableCell>
                      <TableCell>
                        <Badge variant={job.is_active ? 'default' : 'secondary'}>
                          {job.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Switch
                            checked={job.is_active ?? false}
                            onCheckedChange={() => toggleJobStatus(job)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(job)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedJob(job);
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedJob?.title}"? This action cannot be undone.
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
