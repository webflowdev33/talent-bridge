import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar,
  Clock,
  Users,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  CalendarDays
} from 'lucide-react';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';

interface Slot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number | null;
  current_capacity: number | null;
}

interface Application {
  id: string;
  status: string;
  slot_id: string | null;
  jobs: {
    title: string;
  };
}

export default function SelectSlot() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [applicationId, user]);

  const fetchData = async () => {
    try {
      // Fetch application details
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('id, status, slot_id, jobs (title)')
        .eq('id', applicationId)
        .eq('user_id', user!.id)
        .single();

      if (appError) throw appError;
      setApplication(appData as unknown as Application);
      setSelectedSlotId(appData.slot_id);

      // Fetch available slots (universal, not job-specific)
      const today = startOfDay(new Date()).toISOString().split('T')[0];
      const { data: slotsData, error: slotsError } = await supabase
        .from('slots')
        .select('*')
        .eq('is_enabled', true)
        .gte('slot_date', today)
        .order('slot_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (slotsError) throw slotsError;

      const rawSlots = slotsData || [];

      // Compute current bookings per slot based on applications, so counts are always accurate
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

      // Filter slots that have capacity
      const availableSlots = slotsWithCounts.filter(
        (slot) => (slot.max_capacity || 50) > (slot.current_capacity || 0)
      );

      setSlots(availableSlots);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast({
        title: 'Error',
        description: 'Failed to load data. Please try again.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = async (slotId: string) => {
    setSelecting(slotId);
    try {
      // Update application with selected slot
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          slot_id: slotId,
          status: 'slot_selected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      toast({
        title: 'Slot Selected!',
        description: 'Your test slot has been booked. Wait for admin approval.',
      });

      navigate('/dashboard');
    } catch (err) {
      console.error('Error selecting slot:', err);
      toast({
        title: 'Selection Failed',
        description: 'Failed to book slot. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSelecting(null);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    if (!acc[slot.slot_date]) {
      acc[slot.slot_date] = [];
    }
    acc[slot.slot_date].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container max-w-3xl">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">Select Test Slot</h1>
            <p className="text-muted-foreground">
              Choose a convenient time slot for your aptitude test
              {application && (
                <span className="block mt-1 text-foreground font-medium">
                  Application: {application.jobs.title}
                </span>
              )}
            </p>
          </div>

          {selectedSlotId && (
            <Card className="mb-6 border-success/50 bg-success/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <p className="text-success font-medium">
                    You have already selected a slot. Wait for admin approval to take the test.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {slots.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">No Slots Available</h3>
                <p className="text-muted-foreground mb-4">
                  No test slots are currently available. Please check back later.
                </p>
                <Button asChild variant="outline">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(slotsByDate).map(([date, dateSlots]) => (
                <Card key={date}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5" />
                      {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                    </CardTitle>
                    <CardDescription>
                      {dateSlots.length} slot{dateSlots.length !== 1 ? 's' : ''} available
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {dateSlots.map((slot) => {
                        const remaining = (slot.max_capacity || 50) - (slot.current_capacity || 0);
                        const isSelected = slot.id === selectedSlotId;
                        
                        return (
                          <div
                            key={slot.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border transition-colors ${
                              isSelected 
                                ? 'border-success bg-success/5' 
                                : 'hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center gap-4 mb-3 sm:mb-0">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">
                                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                </p>
                                {/* <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Users className="h-4 w-4" />
                                  <span>{remaining} spots remaining</span>
                                </div> */}
                              </div>
                            </div>
                            
                            {isSelected ? (
                              <Badge className="bg-success text-success-foreground">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Selected
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleSelectSlot(slot.id)}
                                disabled={selecting === slot.id || !!selectedSlotId}
                              >
                                {selecting === slot.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Select Slot'
                                )}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
