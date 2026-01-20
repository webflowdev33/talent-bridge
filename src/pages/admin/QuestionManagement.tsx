import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Upload, 
  FileSpreadsheet, 
  Download,
  Loader2,
  HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Job {
  id: string;
  title: string;
}

interface Question {
  id: string;
  job_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string;
  marks: number | null;
  round_number: number | null;
  created_at: string | null;
}

interface QuestionFormData {
  job_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  marks: number;
  round_number: number;
}

const defaultFormData: QuestionFormData = {
  job_id: '',
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
  marks: 1,
  round_number: 1,
};

export default function QuestionManagement() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('all');
  const [formData, setFormData] = useState<QuestionFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadJobId, setUploadJobId] = useState<string>('');
  const [uploadRound, setUploadRound] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title')
        .order('title');

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);
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

  const handleOpenDialog = (question?: Question) => {
    if (question) {
      setSelectedQuestion(question);
      setFormData({
        job_id: question.job_id,
        question_text: question.question_text,
        option_a: question.option_a,
        option_b: question.option_b,
        option_c: question.option_c || '',
        option_d: question.option_d || '',
        correct_answer: question.correct_answer,
        marks: question.marks || 1,
        round_number: question.round_number || 1,
      });
    } else {
      setSelectedQuestion(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const questionData = {
        job_id: formData.job_id,
        question_text: formData.question_text,
        option_a: formData.option_a,
        option_b: formData.option_b,
        option_c: formData.option_c || null,
        option_d: formData.option_d || null,
        correct_answer: formData.correct_answer,
        marks: formData.marks,
        round_number: formData.round_number,
      };

      if (selectedQuestion) {
        const { error } = await supabase
          .from('questions')
          .update(questionData)
          .eq('id', selectedQuestion.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Question updated successfully' });
      } else {
        const { error } = await supabase.from('questions').insert(questionData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Question created successfully' });
      }

      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedQuestion) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', selectedQuestion.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Question deleted successfully' });
      setDeleteDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        question_text: 'What is 2 + 2?',
        option_a: '3',
        option_b: '4',
        option_c: '5',
        option_d: '6',
        correct_answer: 'B',
        marks: 1,
      },
      {
        question_text: 'What is the capital of France?',
        option_a: 'London',
        option_b: 'Berlin',
        option_c: 'Paris',
        option_d: 'Rome',
        correct_answer: 'C',
        marks: 1,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, 'question_template.xlsx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadJobId) {
      toast({
        title: 'Error',
        description: 'Please select a job role first',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const questionsToInsert = jsonData.map((row: any) => ({
        job_id: uploadJobId,
        question_text: row.question_text || row['Question Text'] || row['question'],
        option_a: String(row.option_a || row['Option A'] || row['A'] || ''),
        option_b: String(row.option_b || row['Option B'] || row['B'] || ''),
        option_c: row.option_c || row['Option C'] || row['C'] || null,
        option_d: row.option_d || row['Option D'] || row['D'] || null,
        correct_answer: String(row.correct_answer || row['Correct Answer'] || row['Answer'] || 'A').toUpperCase(),
        marks: parseInt(row.marks || row['Marks'] || '1') || 1,
        round_number: uploadRound,
      }));

      // Validate questions
      const validQuestions = questionsToInsert.filter(q => 
        q.question_text && q.option_a && q.option_b && q.correct_answer
      );

      if (validQuestions.length === 0) {
        throw new Error('No valid questions found in the file');
      }

      const { error } = await supabase.from('questions').insert(validQuestions);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${validQuestions.length} questions uploaded successfully`,
      });

      setUploadDialogOpen(false);
      setUploadJobId('');
      setUploadRound(1);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const getJobTitle = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    return job?.title || 'Unknown';
  };

  const filteredQuestions = selectedJobFilter === 'all'
    ? questions
    : questions.filter(q => q.job_id === selectedJobFilter);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Question Management</h1>
            <p className="text-muted-foreground">Create and manage test questions</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" /> Upload Excel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Questions from Excel</DialogTitle>
                  <DialogDescription>
                    Upload an Excel file with questions. Download the template first.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <Button variant="outline" onClick={downloadTemplate} className="w-full">
                    <Download className="mr-2 h-4 w-4" /> Download Template
                  </Button>

                  <div className="space-y-2">
                    <Label>Select Job Role *</Label>
                    <Select value={uploadJobId} onValueChange={setUploadJobId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a job" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Round Number</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={uploadRound}
                      onChange={(e) => setUploadRound(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Select Excel File</Label>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      disabled={uploading || !uploadJobId}
                    />
                  </div>

                  {uploading && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading questions...
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" /> Add Question
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{selectedQuestion ? 'Edit Question' : 'Add New Question'}</DialogTitle>
                    <DialogDescription>
                      {selectedQuestion ? 'Update question details' : 'Create a new question for the test'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Job Role *</Label>
                        <Select 
                          value={formData.job_id} 
                          onValueChange={(value) => setFormData({ ...formData, job_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a job" />
                          </SelectTrigger>
                          <SelectContent>
                            {jobs.map((job) => (
                              <SelectItem key={job.id} value={job.id}>
                                {job.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label>Round</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={formData.round_number}
                            onChange={(e) => setFormData({ ...formData, round_number: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Marks</Label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={formData.marks}
                            onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Question Text *</Label>
                      <Textarea
                        value={formData.question_text}
                        onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                        placeholder="Enter your question here..."
                        rows={3}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Option A *</Label>
                        <Input
                          value={formData.option_a}
                          onChange={(e) => setFormData({ ...formData, option_a: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Option B *</Label>
                        <Input
                          value={formData.option_b}
                          onChange={(e) => setFormData({ ...formData, option_b: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Option C</Label>
                        <Input
                          value={formData.option_c}
                          onChange={(e) => setFormData({ ...formData, option_c: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Option D</Label>
                        <Input
                          value={formData.option_d}
                          onChange={(e) => setFormData({ ...formData, option_d: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Correct Answer *</Label>
                      <Select 
                        value={formData.correct_answer} 
                        onValueChange={(value) => setFormData({ ...formData, correct_answer: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting || !formData.job_id}>
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {selectedQuestion ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label>Filter by Job:</Label>
              <Select value={selectedJobFilter} onValueChange={setSelectedJobFilter}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="All Jobs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
            <CardDescription>
              {filteredQuestions.length} question(s) {selectedJobFilter !== 'all' && `for ${getJobTitle(selectedJobFilter)}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-8">
                <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No questions found</p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" /> Upload Excel
                  </Button>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" /> Add Question
                  </Button>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Question</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Round</TableHead>
                    <TableHead>Answer</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-medium">
                        <p className="line-clamp-2">{question.question_text}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getJobTitle(question.job_id)}</Badge>
                      </TableCell>
                      <TableCell>{question.round_number || 1}</TableCell>
                      <TableCell>
                        <Badge className="bg-success text-success-foreground">
                          {question.correct_answer}
                        </Badge>
                      </TableCell>
                      <TableCell>{question.marks || 1}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(question)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedQuestion(question);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Question</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
