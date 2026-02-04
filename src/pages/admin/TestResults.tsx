import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  User,
  Briefcase,
  Calendar,
  Clock,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

interface TestAttempt {
  id: string;
  user_id: string;
  application_id: string;
  round_number: number | null;
  started_at: string | null;
  ended_at: string | null;
  total_marks: number | null;
  obtained_marks: number | null;
  passing_marks: number | null;
  is_passed: boolean | null;
  is_submitted: boolean | null;
  auto_submitted: boolean | null;
  applications?: {
    jobs?: {
      title: string;
    };
  };
  profiles?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

interface Answer {
  id: string;
  question_id: string;
  selected_answer: string | null;
  is_correct: boolean | null;
  questions?: {
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string | null;
    option_d: string | null;
    correct_answer: string;
    marks: number | null;
  };
}

export default function TestResults() {
  const [testAttempts, setTestAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAttempt, setSelectedAttempt] = useState<TestAttempt | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTestAttempts();
  }, []);

  useEffect(() => {
    if (detailsDialogOpen && selectedAttempt) {
      fetchAnswers(selectedAttempt.id);
    }
  }, [detailsDialogOpen, selectedAttempt]);

  const fetchTestAttempts = async () => {
    try {
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('test_attempts')
        .select(`
          *,
          applications:application_id (
            jobs:job_id (title)
          )
        `)
        .eq('is_submitted', true)
        .order('created_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Fetch profiles for all users
      const userIds = [...new Set((attemptsData || []).map(attempt => attempt.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      const enrichedAttempts = (attemptsData || []).map(attempt => ({
        ...attempt,
        profiles: profilesMap.get(attempt.user_id) || null,
      }));

      setTestAttempts(enrichedAttempts as TestAttempt[]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnswers = async (testAttemptId: string) => {
    setAnswersLoading(true);
    try {
      const { data: answersData, error: answersError } = await supabase
        .from('answers')
        .select(`
          *,
          questions:question_id (
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer,
            marks
          )
        `)
        .eq('test_attempt_id', testAttemptId)
        .order('created_at', { ascending: true });

      if (answersError) throw answersError;

      setAnswers(answersData as Answer[]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAnswersLoading(false);
    }
  };

  const handleViewDetails = (attempt: TestAttempt) => {
    setSelectedAttempt(attempt);
    setDetailsDialogOpen(true);
  };

  const filteredAttempts = testAttempts.filter((attempt) => {
    const matchesSearch =
      attempt.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attempt.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attempt.applications?.jobs?.title?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'passed' && attempt.is_passed === true) ||
      (statusFilter === 'failed' && attempt.is_passed === false);

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (isPassed: boolean | null) => {
    if (isPassed === true) {
      return <Badge className="bg-success text-success-foreground">Passed</Badge>;
    }
    if (isPassed === false) {
      return <Badge variant="destructive">Failed</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const getOptionLabel = (option: string | null) => {
    if (!option) return null;
    const optionMap: Record<string, string> = {
      A: 'option_a',
      B: 'option_b',
      C: 'option_c',
      D: 'option_d',
    };
    return optionMap[option];
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Results</h1>
          <p className="text-muted-foreground">View all test attempts and candidate answers</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or job title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Attempts</CardTitle>
            <CardDescription>
              {filteredAttempts.length} of {testAttempts.length} test attempt(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAttempts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No test attempts found matching your search' : 'No test attempts found'}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Round</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={attempt.profiles?.avatar_url || undefined}
                                alt={attempt.profiles?.full_name || 'User'}
                              />
                              <AvatarFallback>
                                {attempt.profiles?.full_name
                                  ? attempt.profiles.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                  : 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{attempt.profiles?.full_name || 'Unknown User'}</p>
                              <p className="text-sm text-muted-foreground">{attempt.profiles?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {attempt.applications?.jobs?.title || 'Unknown Job'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Round {attempt.round_number || 1}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {attempt.obtained_marks || 0} / {attempt.total_marks || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Passing: {attempt.passing_marks || 0}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(attempt.is_passed)}</TableCell>
                        <TableCell>
                          {attempt.started_at ? (
                            <div className="text-sm">
                              <p>{format(new Date(attempt.started_at), 'MMM dd, yyyy')}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(attempt.started_at), 'hh:mm a')}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(attempt)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Answers
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Attempt Details</DialogTitle>
            <DialogDescription>
              View all answers submitted by the candidate
            </DialogDescription>
          </DialogHeader>
          {selectedAttempt && (
            <div className="space-y-4">
              {/* Candidate Info */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={selectedAttempt.profiles?.avatar_url || undefined}
                    alt={selectedAttempt.profiles?.full_name || 'User'}
                  />
                  <AvatarFallback>
                    {selectedAttempt.profiles?.full_name
                      ? selectedAttempt.profiles.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{selectedAttempt.profiles?.full_name || 'Unknown User'}</h3>
                  <p className="text-sm text-muted-foreground">{selectedAttempt.profiles?.email}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedAttempt.applications?.jobs?.title || 'Unknown Job'}</span>
                    </div>
                    <Badge variant="outline">Round {selectedAttempt.round_number || 1}</Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {selectedAttempt.obtained_marks || 0} / {selectedAttempt.total_marks || 0}
                  </div>
                  <div className="mt-1">{getStatusBadge(selectedAttempt.is_passed)}</div>
                </div>
              </div>

              {/* Test Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <p className="text-sm text-muted-foreground">Started At</p>
                  <p className="font-medium">
                    {selectedAttempt.started_at
                      ? format(new Date(selectedAttempt.started_at), 'MMM dd, yyyy hh:mm a')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ended At</p>
                  <p className="font-medium">
                    {selectedAttempt.ended_at
                      ? format(new Date(selectedAttempt.ended_at), 'MMM dd, yyyy hh:mm a')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Passing Marks</p>
                  <p className="font-medium">{selectedAttempt.passing_marks || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submission Type</p>
                  <p className="font-medium">
                    {selectedAttempt.auto_submitted ? (
                      <Badge variant="outline" className="text-warning">Auto-submitted</Badge>
                    ) : (
                      <Badge variant="outline" className="text-success">Manual</Badge>
                    )}
                  </p>
                </div>
              </div>

              {/* Answers */}
              <div>
                <h4 className="font-semibold mb-4">Answers ({answers.length} questions)</h4>
                {answersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : answers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No answers found</p>
                ) : (
                  <div className="space-y-4">
                    {answers.map((answer, index) => {
                      const question = answer.questions;
                      if (!question) return null;

                      const selectedOption = getOptionLabel(answer.selected_answer);
                      const correctOption = getOptionLabel(question.correct_answer);
                      const isCorrect = answer.is_correct;

                      return (
                        <Card
                          key={answer.id}
                          className={`border-l-4 ${
                            isCorrect ? 'border-l-green-500' : 'border-l-red-500'
                          }`}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-base">
                                Question {index + 1}
                                {isCorrect ? (
                                  <CheckCircle className="inline-block h-4 w-4 ml-2 text-green-500" />
                                ) : (
                                  <XCircle className="inline-block h-4 w-4 ml-2 text-red-500" />
                                )}
                              </CardTitle>
                              <Badge variant="outline">
                                {question.marks || 1} mark{question.marks !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <CardDescription className="text-base mt-2">
                              {question.question_text}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div
                                className={`p-3 rounded-lg border ${
                                  selectedOption === 'option_a'
                                    ? isCorrect
                                      ? 'bg-green-50 border-green-500'
                                      : 'bg-red-50 border-red-500'
                                    : correctOption === 'option_a'
                                    ? 'bg-green-50 border-green-300'
                                    : 'bg-muted/30'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">A:</span>
                                  <span>{question.option_a}</span>
                                  {selectedOption === 'option_a' && (
                                    <Badge variant="outline" className="ml-auto">
                                      Selected
                                    </Badge>
                                  )}
                                  {correctOption === 'option_a' && selectedOption !== 'option_a' && (
                                    <Badge className="ml-auto bg-green-500">Correct</Badge>
                                  )}
                                </div>
                              </div>
                              <div
                                className={`p-3 rounded-lg border ${
                                  selectedOption === 'option_b'
                                    ? isCorrect
                                      ? 'bg-green-50 border-green-500'
                                      : 'bg-red-50 border-red-500'
                                    : correctOption === 'option_b'
                                    ? 'bg-green-50 border-green-300'
                                    : 'bg-muted/30'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">B:</span>
                                  <span>{question.option_b}</span>
                                  {selectedOption === 'option_b' && (
                                    <Badge variant="outline" className="ml-auto">
                                      Selected
                                    </Badge>
                                  )}
                                  {correctOption === 'option_b' && selectedOption !== 'option_b' && (
                                    <Badge className="ml-auto bg-green-500">Correct</Badge>
                                  )}
                                </div>
                              </div>
                              {question.option_c && (
                                <div
                                  className={`p-3 rounded-lg border ${
                                    selectedOption === 'option_c'
                                      ? isCorrect
                                        ? 'bg-green-50 border-green-500'
                                        : 'bg-red-50 border-red-500'
                                      : correctOption === 'option_c'
                                      ? 'bg-green-50 border-green-300'
                                      : 'bg-muted/30'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">C:</span>
                                    <span>{question.option_c}</span>
                                    {selectedOption === 'option_c' && (
                                      <Badge variant="outline" className="ml-auto">
                                        Selected
                                      </Badge>
                                    )}
                                    {correctOption === 'option_c' && selectedOption !== 'option_c' && (
                                      <Badge className="ml-auto bg-green-500">Correct</Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                              {question.option_d && (
                                <div
                                  className={`p-3 rounded-lg border ${
                                    selectedOption === 'option_d'
                                      ? isCorrect
                                        ? 'bg-green-50 border-green-500'
                                        : 'bg-red-50 border-red-500'
                                      : correctOption === 'option_d'
                                      ? 'bg-green-50 border-green-300'
                                      : 'bg-muted/30'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">D:</span>
                                    <span>{question.option_d}</span>
                                    {selectedOption === 'option_d' && (
                                      <Badge variant="outline" className="ml-auto">
                                        Selected
                                      </Badge>
                                    )}
                                    {correctOption === 'option_d' && selectedOption !== 'option_d' && (
                                      <Badge className="ml-auto bg-green-500">Correct</Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>
    </AdminLayout>
  );
}
