import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HiringPipeline } from '@/components/admin/HiringPipeline';
import { CandidateFunnel } from '@/components/admin/CandidateFunnel';
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
  ArrowRight,
  Search,
  Loader2,
  Mail,
  Phone,
  User,
  UserCheck,
  UserX,
  AlertCircle,
  FileText,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalUsers: number;
  totalApplications: number;
  pendingApprovals: number;
  totalSlots: number;
  availableSlots: number;
  testsCompleted: number;
  testsPassed: number;
  testsFailed: number;
  selectedCandidates: number;
  rejectedApplications: number;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  profile_completed: boolean | null;
  created_at: string | null;
  applications_count?: number;
  avatarSignedUrl?: string | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeJobs: 0,
    totalUsers: 0,
    totalApplications: 0,
    pendingApprovals: 0,
    totalSlots: 0,
    availableSlots: 0,
    testsCompleted: 0,
    testsPassed: 0,
    testsFailed: 0,
    selectedCandidates: 0,
    rejectedApplications: 0,
  });
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchUsers();
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

      // Fetch total users count
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch applications count
      const { count: totalApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });

      // Pending approvals: not approved and not in final states (rejected/selected)
      const { count: pendingApprovals } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('admin_approved', false)
        .neq('status', 'rejected')
        .neq('status', 'selected');

      const { count: selectedCandidates } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'selected');

      const { count: rejectedApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected');

      // Fetch slots count
      const { count: totalSlots } = await supabase
        .from('slots')
        .select('*', { count: 'exact', head: true })
        .eq('is_enabled', true);

      // Fetch available slots (with capacity)
      const { data: slotsData } = await supabase
        .from('slots')
        .select('id, max_capacity, current_capacity, is_enabled')
        .eq('is_enabled', true);

      const availableSlots = (slotsData || []).filter(slot => {
        const max = slot.max_capacity || 50;
        const current = slot.current_capacity || 0;
        return current < max;
      }).length;

      // Fetch test attempts counts
      const { count: testsCompleted } = await supabase
        .from('test_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('is_submitted', true);

      const { count: testsPassed } = await supabase
        .from('test_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('is_submitted', true)
        .eq('is_passed', true);

      const { count: testsFailed } = await supabase
        .from('test_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('is_submitted', true)
        .eq('is_passed', false);

      setStats({
        totalJobs: totalJobs || 0,
        activeJobs: activeJobs || 0,
        totalUsers: totalUsers || 0,
        totalApplications: totalApplications || 0,
        pendingApprovals: pendingApprovals || 0,
        totalSlots: totalSlots || 0,
        availableSlots: availableSlots,
        testsCompleted: testsCompleted || 0,
        testsPassed: testsPassed || 0,
        testsFailed: testsFailed || 0,
        selectedCandidates: selectedCandidates || 0,
        rejectedApplications: rejectedApplications || 0,
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

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get user IDs
      const userIds = (profilesData || []).map(p => p.user_id);

      // Fetch application counts for each user
      const { data: applicationsData } = await supabase
        .from('applications')
        .select('user_id')
        .in('user_id', userIds);

      // Count applications per user
      const appCounts = (applicationsData || []).reduce((acc: Record<string, number>, app) => {
        acc[app.user_id] = (acc[app.user_id] || 0) + 1;
        return acc;
      }, {});

      // Generate signed URLs for avatars
      const enrichedUsers = await Promise.all(
        (profilesData || []).map(async (profile) => {
          let avatarSignedUrl: string | null = null;

          if (profile.avatar_url) {
            // If it's already a URL (http/https), use it directly
            if (profile.avatar_url.startsWith('http://') || profile.avatar_url.startsWith('https://')) {
              avatarSignedUrl = profile.avatar_url;
            } else {
              // Otherwise, generate signed URL from storage
              try {
                const { data, error } = await supabase.storage
                  .from('avatars')
                  .createSignedUrl(profile.avatar_url, 60 * 60); // 1 hour

                if (!error && data) {
                  avatarSignedUrl = data.signedUrl;
                }
              } catch (err) {
                console.error('Error creating signed avatar URL:', err);
              }
            }
          }

          return {
            ...profile,
            applications_count: appCounts[profile.user_id] || 0,
            avatarSignedUrl,
          };
        })
      );

      setUsers(enrichedUsers as UserProfile[]);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = userSearchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower)
    );
  });

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
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage jobs, applications, and tests</p>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="sticky top-0 z-10 mb-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border shadow-sm">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="pipeline" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Grid - Consolidated */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Total Users */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Users</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">Registered</p>
                </CardContent>
              </Card>

              {/* Jobs */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Jobs</CardTitle>
                  <Briefcase className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeJobs}<span className="text-sm font-normal text-muted-foreground">/{stats.totalJobs}</span></div>
                  <p className="text-xs text-muted-foreground">Active / Total</p>
                </CardContent>
              </Card>

              {/* Applications */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Applications</CardTitle>
                  <ClipboardCheck className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalApplications}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-warning">{stats.pendingApprovals} pending</span>
                  </div>
                </CardContent>
              </Card>

              {/* Slots */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Test Slots</CardTitle>
                  <Calendar className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.availableSlots}<span className="text-sm font-normal text-muted-foreground">/{stats.totalSlots}</span></div>
                  <p className="text-xs text-muted-foreground">Available / Total</p>
                </CardContent>
              </Card>
            </div>

            {/* Test Results & Outcomes */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Tests Completed</CardTitle>
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.testsCompleted}</div>
                  <div className="flex gap-3 text-xs mt-1">
                    <span className="text-success flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> {stats.testsPassed} passed
                    </span>
                    <span className="text-destructive flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> {stats.testsFailed} failed
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Selected</CardTitle>
                  <UserCheck className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{stats.selectedCandidates}</div>
                  <p className="text-xs text-muted-foreground">Final selections</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                  <UserX className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{stats.rejectedApplications}</div>
                  <p className="text-xs text-muted-foreground">Rejected applications</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
                  <Button asChild className="h-auto py-3 flex-col gap-1.5">
                    <Link to="/admin/jobs">
                      <Briefcase className="h-4 w-4" />
                      <span className="text-xs">Jobs</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5">
                    <Link to="/admin/slots">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs">Slots</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5">
                    <Link to="/admin/applications">
                      <Users className="h-4 w-4" />
                      <span className="text-xs">Applications</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5">
                    <Link to="/admin/questions">
                      <ClipboardCheck className="h-4 w-4" />
                      <span className="text-xs">Questions</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-3 flex-col gap-1.5">
                    <Link to="/admin/results">
                      <FileText className="h-4 w-4" />
                      <span className="text-xs">Results</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <CandidateFunnel />
            </div>
            <HiringPipeline />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  View all registered users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {usersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {userSearchTerm ? 'No users found matching your search' : 'No users found'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Profile</TableHead>
                          <TableHead>Applications</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage 
                                    src={user.avatarSignedUrl || user.avatar_url || undefined} 
                                    alt={user.full_name || 'User'} 
                                  />
                                  <AvatarFallback className="bg-muted text-xs">
                                    {user.full_name 
                                      ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                      : <User className="h-4 w-4 text-muted-foreground" />}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{user.full_name || 'Unknown'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-0.5">
                                {user.email && (
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                    <span className="truncate max-w-[180px]">{user.email}</span>
                                  </div>
                                )}
                                {user.phone && (
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                    <span>{user.phone}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.profile_completed ? (
                                <Badge className="bg-success text-success-foreground text-xs">Complete</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Incomplete</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{user.applications_count || 0}</span>
                            </TableCell>
                            <TableCell>
                              {user.created_at ? (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(user.created_at), 'MMM dd, yyyy')}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {filteredUsers.length > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    Showing {filteredUsers.length} of {users.length} users
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
