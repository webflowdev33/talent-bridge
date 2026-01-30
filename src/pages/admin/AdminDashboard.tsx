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
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage jobs, applications, and tests</p>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="pipeline" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-8">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {/* Total Users */}
              <Card className="border-l-4 border-l-primary">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Registered users
                  </p>
                </CardContent>
              </Card>

              {/* Total Jobs */}
              <Card className="border-l-4 border-l-accent">
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

              {/* Total Applications */}
              <Card className="border-l-4 border-l-warning">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Applications</CardTitle>
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalApplications}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.pendingApprovals} pending approval
                  </p>
                </CardContent>
              </Card>

            

              {/* Test Slots */}
              <Card className="border-l-4 border-l-primary">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Test Slots</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSlots}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.availableSlots} available
                  </p>
                </CardContent>
              </Card>

              {/* Tests Completed */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Tests Completed</CardTitle>
                  <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.testsCompleted}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.testsPassed} passed, {stats.testsFailed} failed
                  </p>
                </CardContent>
              </Card>

              {/* Tests Passed */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Tests Passed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.testsPassed}</div>
                  <p className="text-xs text-muted-foreground">
                    Successful attempts
                  </p>
                </CardContent>
              </Card>

              {/* Tests Failed */}
              <Card className="border-l-4 border-l-red-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Tests Failed</CardTitle>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.testsFailed}</div>
                  <p className="text-xs text-muted-foreground">
                    Unsuccessful attempts
                  </p>
                </CardContent>
              </Card>

              {/* Selected Candidates */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Selected Candidates</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.selectedCandidates}</div>
                  <p className="text-xs text-muted-foreground">
                    Final selections
                  </p>
                </CardContent>
              </Card>

              {/* Rejected Applications */}
              <Card className="border-l-4 border-l-red-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                  <UserX className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.rejectedApplications}</div>
                  <p className="text-xs text-muted-foreground">
                    Rejected applications
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 mb-8">
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
              <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                <Link to="/admin/results">
                  <FileText className="h-5 w-5" />
                  <span>Test Results</span>
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
                  Manage and view all registered users in the system
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
                          <TableHead>Profile Status</TableHead>
                          <TableHead>Applications</TableHead>
                          <TableHead>Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage 
                                    src={user.avatarSignedUrl || user.avatar_url || undefined} 
                                    alt={user.full_name || 'User'} 
                                  />
                                  <AvatarFallback className="bg-muted">
                                    {user.full_name 
                                      ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                      : <User className="h-5 w-5 text-muted-foreground" />}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{user.full_name || 'Unknown User'}</p>
                                  <p className="text-sm text-muted-foreground">ID: {user.user_id.slice(0, 8)}...</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {user.email && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                    <span>{user.email}</span>
                                  </div>
                                )}
                                {user.phone && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                    <span>{user.phone}</span>
                                  </div>
                                )}
                                {!user.email && !user.phone && (
                                  <span className="text-sm text-muted-foreground">No contact info</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.profile_completed ? (
                                <Badge className="bg-success text-success-foreground">Completed</Badge>
                              ) : (
                                <Badge variant="outline">Incomplete</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{user.applications_count || 0}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.created_at ? (
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(user.created_at), 'MMM dd, yyyy')}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">Unknown</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {filteredUsers.length > 0 && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Showing {filteredUsers.length} of {users.length} user(s)
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
