import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
  skipGuideCheck?: boolean;
}

export const ProtectedRoute = ({ children, requiredRole, skipGuideCheck = false }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const [checkingGuide, setCheckingGuide] = useState(false);
  const [guideAcknowledged, setGuideAcknowledged] = useState<boolean | null>(null);

  useEffect(() => {
    const checkGuideAcknowledgment = async () => {
      // Skip check for admin users or if explicitly skipped
      if (role === 'admin' || skipGuideCheck || !user) {
        setGuideAcknowledged(true);
        return;
      }

      // Skip check for guide page itself
      if (location.pathname === '/guide') {
        setGuideAcknowledged(true);
        return;
      }

      setCheckingGuide(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('guide_acknowledged')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setGuideAcknowledged(data?.guide_acknowledged ?? false);
      } catch (error) {
        console.error('Error checking guide acknowledgment:', error);
        setGuideAcknowledged(false);
      } finally {
        setCheckingGuide(false);
      }
    };

    if (!loading && user) {
      checkGuideAcknowledgment();
    }
  }, [user, role, loading, location.pathname, skipGuideCheck]);

  if (loading || checkingGuide) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to={role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  // For non-admin users, check if guide is acknowledged
  if (role === 'user' && !skipGuideCheck && location.pathname !== '/guide' && guideAcknowledged === false) {
    return <Navigate to="/guide" replace />;
  }

  return <>{children}</>;
};
