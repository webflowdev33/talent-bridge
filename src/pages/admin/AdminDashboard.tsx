import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Briefcase, 
  Users, 
  Calendar, 
  ClipboardCheck,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  ArrowRight
} from 'lucide-react';

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  pendingApprovals: number;
  totalSlots: number;
  testsCompleted: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    pendingApprovals: 0,
    totalSlots: 0,
    testsCompleted: 0,
  });
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch jobs count
      const { count: totalJobs } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });

      const { count: activeJobs } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch applications count
      const { count: totalApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });

      const { count: pendingApprovals } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('admin_approved', false)
        .eq('status', 'applied');

      // Fetch slots count
      const { count: totalSlots } = await supabase
        .from('slots')
        .select('*', { count: 'exact', head: true });

      // Fetch completed tests count
      const { count: testsCompleted } = await supabase
        .from('test_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('is_submitted', true);

      setStats({
        totalJobs: totalJobs || 0,
        activeJobs: activeJobs || 0,
        totalApplications: totalApplications || 0,
        pendingApprovals: pendingApprovals || 0,
        totalSlots: totalSlots || 0,
        testsCompleted: testsCompleted || 0,
      });

      // Fetch recent applications
      const { data: applications } = await supabase
        .from('applications')
        .select(`
          *,
          jobs:job_id (title),
          profiles:user_id (full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentApplications(applications || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, approved: boolean) => {
    if (status === 'applied' && !approved) {
      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning">Pending Approval</Badge>;
    }
    if (status === 'applied' && approved) {
      return <Badge variant="outline" className="bg-primary/10 text-primary border-primary">Approved</Badge>;
    }
    if (status === 'passed') {
      return <Badge variant="outline" className="bg-success/10 text-success border-success">Passed</Badge>;
    }
    if (status === 'failed') {
      return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive">Failed</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage jobs, applications, and tests</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalJobs}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeJobs} active
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalApplications}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingApprovals} pending approval
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Test Slots</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSlots}</div>
              <p className="text-xs text-muted-foreground">
                Scheduled slots
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-success">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tests Completed</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.testsCompleted}</div>
              <p className="text-xs text-muted-foreground">
                Total submissions
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting review
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeJobs}</div>
              <p className="text-xs text-muted-foreground">
                Currently accepting
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Button asChild className="h-auto py-4 flex-col gap-2">
            <Link to="/admin/jobs">
              <Briefcase className="h-5 w-5" />
              <span>Manage Jobs</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <Link to="/admin/slots">
              <Calendar className="h-5 w-5" />
              <span>Manage Slots</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <Link to="/admin/applications">
              <Users className="h-5 w-5" />
              <span>Applications</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
            <Link to="/admin/questions">
              <ClipboardCheck className="h-5 w-5" />
              <span>Questions</span>
            </Link>
          </Button>
        </div>

        {/* Recent Applications */}
        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Applications</CardTitle>
              <CardDescription>Latest applications submitted by users</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/applications">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentApplications.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No applications yet</p>
            ) : (
              <div className="space-y-4">
                {recentApplications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{app.profiles?.full_name || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">{app.profiles?.email}</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-sm font-medium">{app.jobs?.title || 'Unknown Job'}</p>
                      <p className="text-xs text-muted-foreground">Round {app.current_round}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(app.status, app.admin_approved)}
                      <Button asChild size="sm" variant="ghost">
                        <Link to={`/admin/applications/${app.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card> */}
      </main>

      <Footer />
    </div>
  );
}
