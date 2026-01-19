import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Upload,
  FileText,
  Loader2,
  CheckCircle2
} from 'lucide-react';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().min(10, 'Please enter a valid phone number').max(20),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  address: z.string().min(5, 'Address must be at least 5 characters').max(200),
  city: z.string().min(2, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(100),
  country: z.string().min(2, 'Country is required').max(100),
  zip_code: z.string().min(4, 'Zip code is required').max(20),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      date_of_birth: '',
      address: '',
      city: '',
      state: '',
      country: '',
      zip_code: '',
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        form.reset({
          full_name: data.full_name || '',
          phone: data.phone || '',
          date_of_birth: data.date_of_birth || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || '',
          zip_code: data.zip_code || '',
        });
        setResumeUrl(data.resume_url);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: ProfileFormData) => {
    setSaving(true);
    try {
      const isComplete = Boolean(
        data.full_name && 
        data.phone && 
        data.date_of_birth && 
        data.address && 
        data.city &&
        resumeUrl
      );

      const { error } = await supabase
        .from('profiles')
        .update({
          ...data,
          profile_completed: isComplete,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: isComplete 
          ? 'Your profile is now complete. You can apply for jobs!'
          : 'Profile saved. Complete all fields and upload resume to apply for jobs.',
      });

      if (isComplete) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      toast({
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid File',
        description: 'Please upload a PDF file.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: 'File Too Large',
        description: 'Resume must be less than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${user!.id}/${Date.now()}-resume.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

      const resumePath = fileName;

      // Update profile with resume URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ resume_url: resumePath })
        .eq('user_id', user!.id);

      if (updateError) throw updateError;

      setResumeUrl(resumePath);
      toast({
        title: 'Resume Uploaded',
        description: 'Your resume has been uploaded successfully.',
      });
    } catch (err) {
      console.error('Error uploading resume:', err);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload resume. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container max-w-3xl">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">Your Profile</h1>
            <p className="text-muted-foreground">
              Complete your profile to apply for jobs. All fields are required.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Basic details about yourself
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      placeholder="John Doe"
                      {...form.register('full_name')}
                    />
                    {form.formState.errors.full_name && (
                      <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      placeholder="+1 234 567 8900"
                      {...form.register('phone')}
                    />
                    {form.formState.errors.phone && (
                      <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth *</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      {...form.register('date_of_birth')}
                    />
                    {form.formState.errors.date_of_birth && (
                      <p className="text-sm text-destructive">{form.formState.errors.date_of_birth.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address
                </CardTitle>
                <CardDescription>
                  Your current address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address *</Label>
                  <Textarea
                    id="address"
                    placeholder="123 Main Street, Apt 4B"
                    {...form.register('address')}
                  />
                  {form.formState.errors.address && (
                    <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="New York"
                      {...form.register('city')}
                    />
                    {form.formState.errors.city && (
                      <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      placeholder="NY"
                      {...form.register('state')}
                    />
                    {form.formState.errors.state && (
                      <p className="text-sm text-destructive">{form.formState.errors.state.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      placeholder="USA"
                      {...form.register('country')}
                    />
                    {form.formState.errors.country && (
                      <p className="text-sm text-destructive">{form.formState.errors.country.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip_code">Zip Code *</Label>
                    <Input
                      id="zip_code"
                      placeholder="10001"
                      {...form.register('zip_code')}
                    />
                    {form.formState.errors.zip_code && (
                      <p className="text-sm text-destructive">{form.formState.errors.zip_code.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resume Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Resume
                </CardTitle>
                <CardDescription>
                  Upload your resume in PDF format (max 5MB)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {resumeUrl ? (
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-success/5 border-success/20">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="font-medium">Resume Uploaded</p>
                        <p className="text-sm text-muted-foreground">PDF document</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Replace
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    ) : (
                      <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                    )}
                    <p className="font-medium mb-1">
                      {uploading ? 'Uploading...' : 'Click to upload your resume'}
                    </p>
                    <p className="text-sm text-muted-foreground">PDF format, max 5MB</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
                Cancel
              </Button>
              <Button type="submit" variant="hero" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save Profile
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
