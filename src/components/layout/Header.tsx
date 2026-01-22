import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, User, LayoutDashboard } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Header() {
  const { user, role, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPublicUrl, setAvatarPublicUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAvatar();
    }
  }, [user]);

  // Refresh avatar when navigating (especially when returning from profile page)
  useEffect(() => {
    if (user && location.pathname !== '/profile') {
      // Small delay to ensure profile update is saved
      const timer = setTimeout(() => {
        fetchAvatar();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, user]);

  const fetchAvatar = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user!.id)
        .single();
      
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      } else {
        setAvatarUrl(null);
      }
    } catch (error) {
      console.error('Error fetching avatar:', error);
      setAvatarUrl(null);
    }
  };

  const getAvatarUrl = () => {
    return avatarPublicUrl;
  };

  // Generate signed URL whenever avatar path changes
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

  // Refresh avatar when window gains focus (e.g., after returning from profile page)
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchAvatar();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getDashboardLink = () => {
    return role === 'admin' ? '/admin' : '/dashboard';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <img src="/logo.svg" alt="Testrow Logo" className="h-10 w-10" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Testrow
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link 
            to="/jobs" 
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200"
          >
            Job Openings
          </Link>
          <Link 
            to="/guide" 
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200"
          >
            Interview Guide
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-10 w-20 animate-pulse rounded-lg bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-muted transition-colors">
                  <Avatar className="h-10 w-10 border-2 border-primary/30">
                    <AvatarImage src={getAvatarUrl() || undefined} alt={user.email || 'User'} />
                    <AvatarFallback className="bg-primary text-white font-semibold">
                      {user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">{user.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {role || 'User'}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={getDashboardLink()} className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild className="hover:text-primary transition-colors">
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button asChild className="bg-primary text-white hover:bg-primary/90 font-semibold">
                <Link to="/auth?tab=signup">Apply Now</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
