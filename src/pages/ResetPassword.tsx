import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';

const changePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    let isValidated = false;

    // Listen for auth state changes (when token is processed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isValidated) return;

      // Check URL hash for recovery type
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');

      if (event === 'PASSWORD_RECOVERY') {
        // This is a password recovery event
        setIsValidToken(true);
        setIsValidating(false);
        isValidated = true;
      } else if (event === 'SIGNED_IN' && session && (type === 'recovery' || accessToken)) {
        // User was signed in via recovery link
        setIsValidToken(true);
        setIsValidating(false);
        isValidated = true;
      } else if (session?.user && (type === 'recovery' || accessToken)) {
        // Session exists and URL indicates recovery
        setIsValidToken(true);
        setIsValidating(false);
        isValidated = true;
      } else if (event && !session && !isValidated) {
        // No valid recovery session
        setIsValidToken(false);
        setIsValidating(false);
        isValidated = true;
      }
    });

    // Also check current session and URL immediately
    const checkInitialState = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');

        if (type === 'recovery' || accessToken) {
          // URL indicates this is a recovery link, wait for auth state change
          // Don't set invalid yet, let the auth state change handler decide
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // If there's a session but no recovery indicators in URL, it might be invalid
          // But we'll let the auth state change handler make the final decision
          return;
        } else {
          // No session and no recovery indicators
          setIsValidToken(false);
          setIsValidating(false);
          isValidated = true;
        }
      } catch (err) {
        console.error('Error checking initial state:', err);
        setIsValidToken(false);
        setIsValidating(false);
        isValidated = true;
      }
    };

    checkInitialState();

    // Timeout fallback - if no response after 5 seconds, show invalid
    const timeout = setTimeout(() => {
      if (!isValidated) {
        setIsValidToken(false);
        setIsValidating(false);
        isValidated = true;
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleChangePassword = async (data: ChangePasswordFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to update password. Please try again.',
          variant: 'destructive',
        });
      } else {
        setPasswordChanged(true);
        toast({
          title: 'Password Updated',
          description: 'Your password has been successfully changed. Please sign in with your new password.',
        });
        
        // Sign out the user after password change for security
        await supabase.auth.signOut();
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/auth?tab=login');
        }, 2000);
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary p-3 sm:p-4">
        <Card className="w-full max-w-md shadow-2xl border border-border">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Validating reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary p-3 sm:p-4">
        <Card className="w-full max-w-md shadow-2xl border border-border animate-fade-in-up">
          <CardHeader className="space-y-3 sm:space-y-4 text-center pb-5 sm:pb-6 px-1">
            <Link to="/" className="flex items-center justify-center gap-2 group">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <img src="/logo.svg" alt="Testrow Logo" className="h-12 w-12 sm:h-14 sm:w-14" />
              </div>
            </Link>
            <CardTitle className="font-display text-2xl sm:text-3xl font-bold text-foreground">Invalid or Expired Link</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              This password reset link is invalid or has expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              className="w-full h-11 sm:h-12 bg-primary text-white hover:bg-primary/90 font-semibold"
            >
              <Link to="/auth?tab=login">Back to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (passwordChanged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary p-3 sm:p-4">
        <Card className="w-full max-w-md shadow-2xl border border-border animate-fade-in-up">
          <CardHeader className="space-y-3 sm:space-y-4 text-center pb-5 sm:pb-6 px-1">
            <Link to="/" className="flex items-center justify-center gap-2 group">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <img src="/logo.svg" alt="Testrow Logo" className="h-12 w-12 sm:h-14 sm:w-14" />
              </div>
            </Link>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="font-display text-2xl sm:text-3xl font-bold text-foreground">Password Changed!</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Your password has been successfully updated. Redirecting to sign in...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-3 sm:p-4">
      <Card className="w-full max-w-md shadow-2xl border border-border animate-fade-in-up">
        <CardHeader className="space-y-3 sm:space-y-4 text-center pb-5 sm:pb-6 px-1">
          <Link to="/" className="flex items-center justify-center gap-2 group">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <img src="/logo.svg" alt="Testrow Logo" className="h-12 w-12 sm:h-14 sm:w-14" />
            </div>
          </Link>
          <CardTitle className="font-display text-2xl sm:text-3xl font-bold text-foreground">Set New Password</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Please enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleChangePassword)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-11 h-11 sm:h-12 border-2 focus:border-primary transition-colors"
                  {...form.register('password')}
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-destructive font-medium">{form.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-11 h-11 sm:h-12 border-2 focus:border-primary transition-colors"
                  {...form.register('confirmPassword')}
                />
              </div>
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive font-medium">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 sm:h-12 bg-primary text-white hover:bg-primary/90 font-semibold shadow-lg hover:shadow-xl transition-all duration-300" 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Change Password
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full h-11 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => navigate('/auth?tab=login')}
            >
              Back to Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
