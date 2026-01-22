import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import imageCompression from 'browser-image-compression';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  CheckCircle2,
  Image as ImageIcon,
  X,
  Link as LinkIcon
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
  resume_url: z.union([
    z.string().url('Please enter a valid URL'),
    z.literal(''),
  ]).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPublicUrl, setAvatarPublicUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
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
      resume_url: '',
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
        form.setValue('resume_url', data.resume_url || '');
        setAvatarUrl(data.avatar_url);
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
        data.state &&
        data.country &&
        data.zip_code &&
        data.resume_url
      );

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone,
          date_of_birth: data.date_of_birth,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          zip_code: data.zip_code,
          resume_url: data.resume_url || null,
          profile_completed: isComplete,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: isComplete 
          ? 'Your profile is now complete. You can apply for jobs!'
          : 'Profile saved. Complete all fields and add resume link to apply for jobs.',
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

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: file.type,
    };
    
    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error('Image compression error:', error);
      return file; // Return original if compression fails
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate image type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file (JPG, PNG, etc.).',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (before compression)
    if (file.size > 10 * 1024 * 1024) { // 10MB limit before compression
      toast({
        title: 'File Too Large',
        description: 'Image must be less than 10MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      // Compress the image
      const compressedFile = await compressImage(file);
      
      const fileName = `${user!.id}/${Date.now()}-avatar.${compressedFile.name.split('.').pop()}`;
      
      // Delete old avatar if exists
      if (avatarUrl) {
        const oldFileName = avatarUrl.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('avatars')
            .remove([`${user!.id}/${oldFileName}`]);
        }
      }
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const avatarPath = fileName;

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarPath })
        .eq('user_id', user!.id);

      if (updateError) throw updateError;

      setAvatarUrl(avatarPath);
      toast({
        title: 'Avatar Uploaded',
        description: 'Your profile picture has been uploaded successfully.',
      });
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      toast({
        title: 'Upload Failed',
        description: err.message || 'Failed to upload avatar. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };


  // Generate a signed URL for the avatar so it works with a private bucket
  useEffect(() => {
    const generateSignedUrl = async () => {
      if (!avatarUrl) {
        setAvatarPublicUrl(null);
        return;
      }
      try {
        const { data, error } = await supabase.storage
          .from('avatars')
          .createSignedUrl(avatarUrl, 60 * 60); // 1 hour

        if (error) {
          console.error('Error creating signed avatar URL:', error);
          setAvatarPublicUrl(null);
          return;
        }

        setAvatarPublicUrl(data?.signedUrl ?? null);
      } catch (err) {
        console.error('Error creating signed avatar URL:', err);
        setAvatarPublicUrl(null);
      }
    };

    generateSignedUrl();
  }, [avatarUrl]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container max-w-3xl">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2 text-foreground">Your Profile</h1>
            <p className="text-muted-foreground">
              Complete your profile to apply for jobs. All fields are required.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            {/* Profile Picture */}
            <Card className="border border-border shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <ImageIcon className="h-5 w-5" />
                  Profile Picture
                </CardTitle>
                <CardDescription>
                  Upload your profile picture (JPG, PNG - max 10MB)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24 border-2 border-primary">
                    <AvatarImage src={avatarPublicUrl || undefined} alt={user?.email || 'User'} />
                    <AvatarFallback className="bg-primary text-white text-2xl">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="w-fit border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold"
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {avatarUrl ? 'Change Picture' : 'Upload Picture'}
                    </Button>
                    {avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            if (avatarUrl) {
                              const fileName = avatarUrl.split('/').pop();
                              if (fileName) {
                                await supabase.storage
                                  .from('avatars')
                                  .remove([`${user!.id}/${fileName}`]);
                              }
                            }
                            await supabase
                              .from('profiles')
                              .update({ avatar_url: null })
                              .eq('user_id', user!.id);
                            setAvatarUrl(null);
                            toast({
                              title: 'Avatar Removed',
                              description: 'Your profile picture has been removed.',
                            });
                          } catch (err: any) {
                            toast({
                              title: 'Error',
                              description: err.message || 'Failed to remove avatar.',
                              variant: 'destructive',
                            });
                          }
                        }}
                        className="w-fit text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card className="border border-border shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
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
            <Card className="border border-border shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
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

            {/* Resume Link */}
            <Card className="border border-border shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <FileText className="h-5 w-5" />
                  Resume Link
                </CardTitle>
                <CardDescription>
                  Add a link to your resume (e.g., Google Drive, Dropbox, LinkedIn, or any public URL)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="resume_url" className="text-sm font-semibold">Resume URL</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="resume_url"
                      type="url"
                      placeholder="https://drive.google.com/file/... or https://linkedin.com/in/..."
                      className="pl-11 h-11 border-2 focus:border-primary transition-colors"
                      {...form.register('resume_url')}
                    />
                  </div>
                  {form.formState.errors.resume_url && (
                    <p className="text-sm text-destructive">{form.formState.errors.resume_url.message}</p>
                  )}
                  {form.watch('resume_url') && (
                    <div className="flex items-center gap-2 p-3 rounded-lg border-2 border-green-500/20 bg-green-50 dark:bg-green-950/10">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <p className="text-sm text-foreground">
                        Resume link added. You can{' '}
                        <a 
                          href={form.watch('resume_url') || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-medium"
                        >
                          view it here
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-primary text-white hover:bg-primary/90 font-semibold shadow-lg hover:shadow-xl transition-all duration-300" 
                disabled={saving}
              >
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
