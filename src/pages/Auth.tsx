import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSignupAttempt, setLastSignupAttempt] = useState<number>(0);
  const { signIn, signUp, resetPassword, user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate(role === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, role, navigate]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Login Failed',
        description: error.message === 'Invalid login credentials' 
          ? 'Incorrect email or password. Please try again.'
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    // Prevent rapid successive signup attempts (debounce)
    const now = Date.now();
    const timeSinceLastAttempt = now - lastSignupAttempt;
    const MIN_TIME_BETWEEN_ATTEMPTS = 2000; // 2 seconds

    if (timeSinceLastAttempt < MIN_TIME_BETWEEN_ATTEMPTS) {
      toast({
        title: 'Please wait',
        description: `Please wait ${Math.ceil((MIN_TIME_BETWEEN_ATTEMPTS - timeSinceLastAttempt) / 1000)} second(s) before trying again.`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setLastSignupAttempt(now);
    
    try {
      const { error } = await signUp(data.email, data.password);

      if (error) {
        let message = error.message;
        let title = 'Signup Failed';

        // Handle rate limit errors specifically
        if (error.message.toLowerCase().includes('rate limit') || 
            error.message.toLowerCase().includes('too many requests') ||
            error.message.toLowerCase().includes('429')) {
          title = 'Rate Limit Exceeded';
          message = 'Too many signup attempts. Please wait a few minutes before trying again.';
        } else if (error.message.includes('already registered') || 
                   error.message.includes('already been registered')) {
          message = 'This email is already registered. Please sign in instead.';
        } else if (error.message.includes('email')) {
          message = 'Invalid email address. Please check and try again.';
        }

        toast({
          title,
          description: message,
          variant: 'destructive',
        });
      } else {
        // Store password in profiles table
        // Note: Password is managed by Supabase Auth, not stored in profiles
        // The user signup is complete at this point
        
        toast({
          title: 'Account Created!',
          description: 'Please Fill your Details to continue',
        });
        navigate('/guide');
      }
    } catch (err: any) {
      toast({
        title: 'Signup Failed',
        description: err.message || 'An unexpected error occurred. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    const { error } = await resetPassword(data.email);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Email Sent',
        description: 'Check your email for the password reset link.',
      });
      setShowForgotPassword(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary p-3 sm:p-4">
        <Card className="w-full max-w-md shadow-2xl border border-border animate-fade-in-up">
          <CardHeader className="space-y-3 sm:space-y-4 text-center pb-5 sm:pb-6 px-1">
            <Link to="/" className="flex items-center justify-center gap-2 group">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <img src="/logo.svg" alt="Testrow Logo" className="h-12 w-12 sm:h-14 sm:w-14" />
              </div>
            </Link>
            <CardTitle className="font-display text-2xl sm:text-3xl font-bold text-foreground">Reset Password</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Enter your email address and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-sm font-semibold">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-11 h-11 sm:h-12 border-2 focus:border-primary transition-colors"
                    {...forgotPasswordForm.register('email')}
                  />
                </div>
                {forgotPasswordForm.formState.errors.email && (
                  <p className="text-sm text-destructive font-medium">{forgotPasswordForm.formState.errors.email.message}</p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 sm:h-12 bg-primary text-white hover:bg-primary/90 font-semibold shadow-lg hover:shadow-xl transition-all duration-300" 
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Send Reset Link
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full h-11 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                onClick={() => setShowForgotPassword(false)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            </form>
          </CardContent>
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
          <CardTitle className="font-display text-2xl sm:text-3xl font-bold text-foreground">Welcome to Testrow</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Sign in to your account or create a new one to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 h-11 sm:h-12 bg-muted">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold transition-all duration-300"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold transition-all duration-300"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-5">
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-semibold">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-11 h-11 sm:h-12 border-2 focus:border-primary transition-colors"
                      {...loginForm.register('email')}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive font-medium">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-semibold">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-11 h-11 sm:h-12 border-2 focus:border-primary transition-colors"
                      {...loginForm.register('password')}
                    />
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive font-medium">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 sm:h-12 bg-primary text-white hover:bg-primary/90 font-semibold shadow-lg hover:shadow-xl transition-all duration-300" 
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                  Sign In
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-primary hover:text-primary/80 font-medium transition-colors"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot your password?
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-5">
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-semibold">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-11 h-11 sm:h-12 border-2 focus:border-primary transition-colors"
                      {...signupForm.register('email')}
                    />
                  </div>
                  {signupForm.formState.errors.email && (
                    <p className="text-sm text-destructive font-medium">{signupForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-semibold">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-11 h-11 sm:h-12 border-2 focus:border-primary transition-colors"
                      {...signupForm.register('password')}
                    />
                  </div>
                  {signupForm.formState.errors.password && (
                    <p className="text-sm text-destructive font-medium">{signupForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-semibold">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-11 h-11 sm:h-12 border-2 focus:border-primary transition-colors"
                      {...signupForm.register('confirmPassword')}
                    />
                  </div>
                  {signupForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive font-medium">{signupForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 sm:h-12 bg-primary text-white hover:bg-primary/90 font-semibold shadow-lg hover:shadow-xl transition-all duration-300" 
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
