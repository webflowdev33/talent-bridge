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
  DialogTrigger,
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Calendar, Clock, Users, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Job {
  id: string;
  title: string;
}

interface Slot {
  id: string;
  job_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number | null;
  current_capacity: number | null;
  is_enabled: boolean | null;
  created_at: string | null;
  jobs?: { title: string };
}

interface SlotFormData {
  job_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  is_enabled: boolean;
}

const defaultFormData: SlotFormData = {
  job_id: '',
  slot_date: '',
  start_time: '09:00',
  end_time: '10:00',
  max_capacity: 50,
  is_enabled: false,
};

export default function SlotManagement() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [formData, setFormData] = useState<SlotFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
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
        .eq('is_active', true)
        .order('title');

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);

      // Fetch slots with job info
      const { data: slotsData, error: slotsError } = await supabase
        .from('slots')
        .select(`
          *,
          jobs:job_id (title)
        `)
        .order('slot_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (slotsError) throw slotsError;
      setSlots(slotsData || []);
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

  const handleOpenDialog = () => {
    setFormData({
      ...defaultFormData,
      slot_date: format(new Date(), 'yyyy-MM-dd'),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.job_id) {
      toast({
        title: 'Error',
        description: 'Please select a job',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from('slots').insert({
        job_id: formData.job_id,
        slot_date: formData.slot_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        max_capacity: formData.max_capacity,
        is_enabled: formData.is_enabled,
        current_capacity: 0,
      });

      if (error) throw error;
      toast({ title: 'Success', description: 'Slot created successfully' });
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
    if (!selectedSlot) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('slots')
        .delete()
        .eq('id', selectedSlot.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Slot deleted successfully' });
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

  const toggleSlotStatus = async (slot: Slot) => {
    try {
      const { error } = await supabase
        .from('slots')
        .update({ is_enabled: !slot.is_enabled })
        .eq('id', slot.id);

      if (error) throw error;
      fetchData();
      toast({
        title: 'Success',
        description: `Slot ${!slot.is_enabled ? 'enabled' : 'disabled'} successfully`,
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
            <h1 className="text-3xl font-bold tracking-tight">Slot Management</h1>
            <p className="text-muted-foreground">Create and manage test time slots</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog}>
                <Plus className="mr-2 h-4 w-4" /> Create Slot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create New Slot</DialogTitle>
                  <DialogDescription>
                    Create a new time slot for tests
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="job">Job *</Label>
                    <Select
                      value={formData.job_id}
                      onValueChange={(value) => setFormData({ ...formData, job_id: value })}
                    >
                      <SelectTrigger>
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

                  <div className="space-y-2">
                    <Label htmlFor="slot_date">Date *</Label>
                    <Input
                      id="slot_date"
                      type="date"
                      value={formData.slot_date}
                      onChange={(e) => setFormData({ ...formData, slot_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_time">Start Time *</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_time">End Time *</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_capacity">Max Capacity</Label>
                    <Input
                      id="max_capacity"
                      type="number"
                      min="1"
                      max="1000"
                      value={formData.max_capacity}
                      onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) || 50 })}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_enabled"
                      checked={formData.is_enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
                    />
                    <Label htmlFor="is_enabled">Enable immediately</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Slot
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {jobs.length === 0 && (
          <Card className="mb-6 border-warning bg-warning/5">
            <CardContent className="pt-6">
              <p className="text-warning-foreground">
                You need to create at least one active job before creating slots.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All Slots</CardTitle>
            <CardDescription>{slots.length} slot(s) created</CardDescription>
          </CardHeader>
          <CardContent>
            {slots.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No slots created yet</p>
                {jobs.length > 0 && (
                  <Button className="mt-4" onClick={handleOpenDialog}>
                    <Plus className="mr-2 h-4 w-4" /> Create Your First Slot
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map((slot) => (
                    <TableRow key={slot.id}>
                      <TableCell className="font-medium">{slot.jobs?.title || 'Unknown'}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(slot.slot_date), 'MMM dd, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {slot.start_time} - {slot.end_time}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {slot.current_capacity || 0} / {slot.max_capacity || 50}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={slot.is_enabled ? 'default' : 'secondary'}>
                          {slot.is_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Switch
                            checked={slot.is_enabled ?? false}
                            onCheckedChange={() => toggleSlotStatus(slot)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedSlot(slot);
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
            <DialogTitle>Delete Slot</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this slot? This action cannot be undone.
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
