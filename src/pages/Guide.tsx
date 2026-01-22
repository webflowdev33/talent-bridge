import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, Calendar, MapPin, Clock, FileText, Users, AlertCircle, Phone, Laptop, Car, UserX, ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function Guide() {
  const [acknowledged, setAcknowledged] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [alreadyAcknowledged, setAlreadyAcknowledged] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const checkAcknowledgmentStatus = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if this is a view-only mode (from Dashboard)
      const viewMode = searchParams.get('view') === 'true';
      setIsViewOnly(viewMode);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('guide_acknowledged')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (data?.guide_acknowledged) {
          setAlreadyAcknowledged(true);
          // If view mode, allow viewing. Otherwise redirect
          if (viewMode) {
            setCheckingStatus(false);
          } else {
            // Already acknowledged and not in view mode, redirect to profile
            navigate('/profile');
          }
        } else {
          setCheckingStatus(false);
        }
      } catch (error: any) {
        console.error('Error checking acknowledgment status:', error);
        setCheckingStatus(false);
      }
    };

    checkAcknowledgmentStatus();
  }, [user, navigate, searchParams]);

  const handleAcknowledge = async () => {
    if (!acknowledged || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          guide_acknowledged: true,
          guide_acknowledged_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Guide Acknowledged',
        description: 'Thank you for reading the guide. Please complete your profile.',
      });

      navigate('/profile');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to acknowledge guide. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl">
        <Card className="shadow-2xl border border-border">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center bg-primary rounded-full">
                <FileText className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">
              Appsrow Walk-In Interview – Complete Guide
            </CardTitle>
            <CardDescription className="text-base sm:text-lg mt-2">
              Please read this guide carefully before proceeding
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 sm:space-y-8">
            {/* Overview */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                Overview
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Appsrow Solutions LLP is conducting an in-person Walk-In Interview for IT freshers and internship seekers. 
                This interview is designed to assess candidates through a structured, role-based process and provide real industry exposure.
              </p>
            </section>

            {/* Who Is This For? */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                Who Is This For?
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-3">This walk-in interview is open to:</p>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-muted-foreground ml-4">
                <li>IT Freshers</li>
                <li>Final-year students</li>
                <li>Internship seekers</li>
                <li>Candidates applying for roles across: Development, Design, Marketing, HR, and Business</li>
              </ul>
            </section>

            {/* Walk-In Interview Details */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                Walk-In Interview Details
              </h2>
              <div className="space-y-4">
                <div className="bg-secondary p-4 rounded-lg border border-border">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Interview Date
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground">Saturday, 24 January</p>
                </div>
                <div className="bg-secondary p-4 rounded-lg border border-border">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Interview Timing
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Slot-based only between 10:00 AM – 3:00 PM<br />
                    <span className="text-primary font-medium">Candidates must attend strictly as per their booked slot.</span>
                  </p>
                </div>
                <div className="bg-secondary p-4 rounded-lg border border-border">
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Interview Location
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Appsrow Office, Ahmedabad<br />
                    C-704, Ganesh Glory 11, Near BSNL Office,<br />
                    S.G. Highway, Jagatpur, Ahmedabad – 382470<br />
                    <span className="text-primary font-medium">This is an on-site, in-person walk-in interview.</span>
                  </p>
                </div>
              </div>
            </section>

            {/* Interview Process */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                Interview Process & Structure
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                The complete interview process takes approximately <span className="font-semibold text-foreground">50 minutes</span> and consists of four stages:
              </p>
              <div className="space-y-3">
                <div className="bg-secondary p-4 rounded-lg border-l-4 border-primary">
                  <h3 className="font-semibold text-foreground mb-1">L1 – Aptitude / Basic MCQ Test</h3>
                  <p className="text-sm text-muted-foreground">A short screening test conducted at the office.</p>
                </div>
                <div className="bg-secondary p-4 rounded-lg border-l-4 border-primary">
                  <h3 className="font-semibold text-foreground mb-1">L2 – Role-Based Technical Interview</h3>
                  <p className="text-sm text-muted-foreground">Evaluation based on the selected role and skills.</p>
                </div>
                <div className="bg-secondary p-4 rounded-lg border-l-4 border-primary">
                  <h3 className="font-semibold text-foreground mb-1">L3 – HR Discussion</h3>
                  <p className="text-sm text-muted-foreground">Discussion around career goals, availability, and expectations.</p>
                </div>
                <div className="bg-secondary p-4 rounded-lg border-l-4 border-primary">
                  <h3 className="font-semibold text-foreground mb-1">L4 – Final Interaction</h3>
                  <p className="text-sm text-muted-foreground">Final interview round.</p>
                </div>
              </div>
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-foreground">
                  <AlertCircle className="h-4 w-4 inline mr-2 text-primary" />
                  <strong>Candidates must clear each stage to proceed to the next.</strong> Not all candidates may go through every stage. The process may vary based on the role.
                </p>
              </div>
            </section>

            {/* Registration & Slot Booking */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                Registration & Slot Booking
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">To attend the walk-in interview:</p>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-muted-foreground ml-4 mb-4">
                <li>Registration is mandatory</li>
                <li>Candidates must select one role only</li>
                <li>Candidates must book one interview slot</li>
                <li>Slots are locked once booked and cannot be changed</li>
              </ul>
              <div className="bg-warning/10 border border-warning/30 p-4 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">Registration Deadline</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  <strong className="text-foreground">23 January 2026 at 3:00 PM</strong><br />
                  Registrations after the deadline may not be accepted.
                </p>
                <p className="text-sm sm:text-base text-muted-foreground mt-2">
                  Only candidates with a confirmed registration and slot should attend the interview.
                </p>
              </div>
            </section>

            {/* What Happens After Registration? */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">What Happens After Registration?</h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-3">Once registration is completed and a slot is booked:</p>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-muted-foreground ml-4">
                <li>Candidates should follow all instructions shared on this website and portal</li>
                <li>Candidates can attend the interview as per their booked slot</li>
                <li>All updates, reminders, and announcements will be shared via the WhatsApp group</li>
              </ul>
            </section>

            {/* Reporting & Entry Guidelines */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Reporting & Entry Guidelines</h2>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-muted-foreground ml-4">
                <li>Candidates must report <strong className="text-foreground">15 minutes before</strong> their booked slot</li>
                <li><strong className="text-destructive">Late arrival is not allowed</strong> and will be subject to management decision</li>
                <li>On arrival, candidates must visit the registration desk for attendance and entry verification</li>
              </ul>
            </section>

            {/* Documents & Device Policy */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Documents & Device Policy</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm sm:text-base text-muted-foreground">
                    All required details and a resume link must be provided during registration
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm sm:text-base text-muted-foreground">
                    No physical documents are required unless informed later
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Laptop className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Laptops are allowed only for candidates who wish to showcase their work
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm sm:text-base text-muted-foreground">
                    <strong className="text-foreground">Mobile phones/Smartwatches must be Silent and in Bag / Pocket </strong>  during the interview process
                  </p>
                </div>
              </div>
            </section>

            {/* Parking Information */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Car className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                Parking Information
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Parking is available outside the building area. Candidates are advised to plan their arrival accordingly.
              </p>
            </section>

            {/* Companion Policy */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <UserX className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                Companion Policy
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Friends, parents, or companions are <strong className="text-foreground">not permitted</strong> inside the office premises.
              </p>
            </section>

            {/* Interview Updates & Results */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Interview Updates & Results</h2>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-muted-foreground ml-4">
                <li>MCQ test results will be shown instantly on the portal</li>
                <li>Interview round status will be updated stage-wise</li>
                <li>Final result will be displayed as Selected or Not Selected</li>
                <li>If selected, further communication will be shared via email by the HR team</li>
              </ul>
            </section>

            {/* Important Rules */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
                Important Rules
              </h2>
              <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg space-y-2">
                <p className="text-sm sm:text-base text-foreground font-semibold">Only one interview slot per candidate is allowed</p>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Multiple registrations or duplicate entries may lead to disqualification
                </p>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Only registered candidates with confirmed slots should attend the walk-in interview
                </p>
              </div>
            </section>

            {/* Support & Communication */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Support & Communication</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                All end-to-end details are available on the website, portal, and WhatsApp group. For portal-related issues, 
                candidates may contact HR via personal WhatsApp message only if necessary.
              </p>
            </section>

            {/* Acknowledgment Section - Only show if not in view-only mode and not already acknowledged */}
            {!isViewOnly && !alreadyAcknowledged && (
              <>
                <div className="pt-6 border-t border-border">
                  <div className="flex items-start space-x-3 p-4 bg-secondary rounded-lg border border-border">
                    <Checkbox
                      id="acknowledge"
                      checked={acknowledged}
                      onCheckedChange={(checked) => setAcknowledged(checked === true)}
                      className="mt-1"
                    />
                    <label
                      htmlFor="acknowledge"
                      className="text-sm sm:text-base text-foreground leading-relaxed cursor-pointer flex-1"
                    >
                      I have read and understood the complete walk-in interview guide. I acknowledge all the rules, 
                      guidelines, and requirements mentioned above.
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={handleAcknowledge}
                    disabled={!acknowledged || isLoading}
                    className="w-full sm:w-auto min-w-[200px] bg-primary text-white hover:bg-primary/90"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        I Acknowledge & Continue
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* View-only mode message or back button */}
            {(isViewOnly || alreadyAcknowledged) && (
              <div className="pt-6 border-t border-border">
                <div className="flex flex-col items-center gap-4">
                  {alreadyAcknowledged && (
                    <div className="flex items-center gap-2 p-4 bg-primary/10 border border-primary/20 rounded-lg w-full">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <p className="text-sm sm:text-base text-foreground">
                        You have already acknowledged this guide. This is a read-only view.
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={() => navigate('/dashboard')}
                    variant="outline"
                    className="w-full sm:w-auto min-w-[200px]"
                    size="lg"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
