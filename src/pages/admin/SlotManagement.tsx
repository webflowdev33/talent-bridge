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

interface Slot {
  id: string;
  job_id: string | null;
  slot_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number | null;
  current_capacity: number | null;
  is_enabled: boolean | null;
  created_at: string | null;
}

interface SlotFormData {
  slot_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  is_enabled: boolean;
}

const defaultFormData: SlotFormData = {
  slot_date: '',
  start_time: '09:00',
  end_time: '10:00',
  max_capacity: 50,
  is_enabled: false,
};

export default function SlotManagement() {
  const [slots, setSlots] = useState<Slot[]>([]);
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
      // Fetch slots
      const { data: slotsData, error: slotsError } = await supabase
        .from('slots')
        .select('*')
        .order('slot_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (slotsError) throw slotsError;

      const rawSlots = slotsData || [];

      // Compute current bookings per slot from applications so counts stay in sync
      const slotIds = rawSlots.map((s) => s.id);
      let bookedCounts: Record<string, number> = {};

      if (slotIds.length > 0) {
        const { data: appsForSlots, error: appsError } = await supabase
          .from('applications')
          .select('slot_id')
          .in('slot_id', slotIds);

        if (appsError) throw appsError;

        bookedCounts = (appsForSlots || []).reduce((acc: Record<string, number>, app: any) => {
          if (!app.slot_id) return acc;
          acc[app.slot_id] = (acc[app.slot_id] || 0) + 1;
          return acc;
        }, {});
      }

      const slotsWithCounts: Slot[] = rawSlots.map((slot: any) => ({
        ...slot,
        current_capacity: bookedCounts[slot.id] ?? 0,
      }));

      setSlots(slotsWithCounts);
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
    // Creating a new slot
    setSelectedSlot(null);
    setFormData({
      ...defaultFormData,
      slot_date: format(new Date(), 'yyyy-MM-dd'),
    });
    setDialogOpen(true);
  };

  const handleEditSlot = (slot: Slot) => {
    // Editing an existing slot
    setSelectedSlot(slot);
    setFormData({
      slot_date: slot.slot_date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      max_capacity: slot.max_capacity || 50,
      is_enabled: Boolean(slot.is_enabled),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (selectedSlot) {
        // Update existing slot (do not touch current_capacity here)
        const { error } = await supabase
          .from('slots')
          .update({
            slot_date: formData.slot_date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            max_capacity: formData.max_capacity,
            is_enabled: formData.is_enabled,
          })
          .eq('id', selectedSlot.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Slot updated successfully' });
      } else {
        // Create new slot
        const { error } = await supabase.from('slots').insert({
          job_id: null,
          slot_date: formData.slot_date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          max_capacity: formData.max_capacity,
          is_enabled: formData.is_enabled,
          current_capacity: 0,
        });

        if (error) throw error;
        toast({ title: 'Success', description: 'Slot created successfully' });
      }

      setDialogOpen(false);
      setSelectedSlot(null);
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
      
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Slot Management</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Create and manage test time slots
              </p>
            </div>
            <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setSelectedSlot(null);
                setFormData(defaultFormData);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={handleOpenDialog} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Create Slot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">
                    {selectedSlot ? 'Edit Slot' : 'Create New Slot'}
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    {selectedSlot
                      ? 'Update the details of this time slot.'
                      : 'Create a universal time slot available for all job applicants.'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedSlot ? 'Save Changes' : 'Create Slot'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
            </Dialog>
          </div>

          <Card className="mt-4 sm:mt-6">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">All Slots</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {slots.length} slot{slots.length !== 1 ? 's' : ''} created
            </CardDescription>
          </CardHeader>
          <CardContent>
            {slots.length === 0 ? (
              <div className="text-center py-8 sm:py-10">
                <Calendar className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
                <p className="text-sm sm:text-base text-muted-foreground">No slots created yet</p>
                <Button className="mt-4 w-full sm:w-auto" onClick={handleOpenDialog}>
                  <Plus className="mr-2 h-4 w-4" /> Create Your First Slot
                </Button>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slots.map((slot) => {
                      const max = slot.max_capacity || 50;
                      const current = slot.current_capacity || 0;
                      const remaining = Math.max(max - current, 0);
                      const isFull = remaining === 0;
                      const isAlmostFull = !isFull && remaining <= Math.max(Math.floor(max * 0.2), 1);

                      return (
                        <TableRow key={slot.id}>
                          <TableCell>
                            <span className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(slot.slot_date), 'MMM dd, yyyy')}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {slot.start_time} - {slot.end_time}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-1 text-sm">
                                <Users className="h-3 w-3" />
                                <span className="font-medium">
                                  {current} / {max}
                                </span>
                              </span>
                              <span
                                className={`text-xs ${
                                  isFull
                                    ? 'text-red-600 font-semibold'
                                    : isAlmostFull
                                    ? 'text-amber-600 font-medium'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {isFull
                                  ? 'Slot full'
                                  : `${remaining} spot${remaining !== 1 ? 's' : ''} remaining`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isFull ? (
                              <Badge className="bg-red-100 text-red-800 border border-red-200">
                                Full
                              </Badge>
                            ) : (
                              <Badge variant={slot.is_enabled ? 'default' : 'secondary'}>
                                {slot.is_enabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditSlot(slot)}
                              >
                                Edit
                              </Button>
                              <Switch
                                checked={slot.is_enabled ?? false}
                                onCheckedChange={() => toggleSlotStatus(slot)}
                                disabled={isFull}
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
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          </Card>
        </div>
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
