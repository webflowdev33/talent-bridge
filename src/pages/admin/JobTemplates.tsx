import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, FileText, Loader2, MapPin, Copy, Briefcase } from 'lucide-react';
import { format } from 'date-fns';

interface JobTemplate {
  id: string;
  title: string;
  department: string | null;
  description: string | null;
  requirements: string | null;
  salary_range: string | null;
  location: string | null;
  total_rounds: number | null;
  question_count: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface Campaign {
  id: string;
  name: string;
  is_active: boolean;
}

interface TemplateFormData {
  title: string;
  department: string;
  description: string;
  requirements: string;
  salary_range: string;
  location: string;
  total_rounds: number;
  question_count: number;
  is_active: boolean;
}

const defaultFormData: TemplateFormData = {
  title: '',
  department: '',
  description: '',
  requirements: '',
  salary_range: '',
  location: '',
  total_rounds: 1,
  question_count: 10,
  is_active: true,
};

export default function JobTemplates() {
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [instantiateDialogOpen, setInstantiateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<JobTemplate | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [formData, setFormData] = useState<TemplateFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, campaignsRes] = await Promise.all([
        supabase
          .from('job_templates')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('campaigns')
          .select('id, name, is_active')
          .eq('is_active', true)
          .order('name'),
      ]);

      if (templatesRes.error) throw templatesRes.error;
      if (campaignsRes.error) throw campaignsRes.error;

      setTemplates(templatesRes.data || []);
      setCampaigns(campaignsRes.data || []);
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

  const handleOpenDialog = (template?: JobTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setFormData({
        title: template.title,
        department: template.department || '',
        description: template.description || '',
        requirements: template.requirements || '',
        salary_range: template.salary_range || '',
        location: template.location || '',
        total_rounds: template.total_rounds || 1,
        question_count: template.question_count || 10,
        is_active: template.is_active ?? true,
      });
    } else {
      setSelectedTemplate(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (selectedTemplate) {
        const { error } = await supabase
          .from('job_templates')
          .update({
            title: formData.title,
            department: formData.department || null,
            description: formData.description || null,
            requirements: formData.requirements || null,
            salary_range: formData.salary_range || null,
            location: formData.location || null,
            total_rounds: formData.total_rounds,
            question_count: formData.question_count,
            is_active: formData.is_active,
          })
          .eq('id', selectedTemplate.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Template updated successfully' });
      } else {
        const { error } = await supabase
          .from('job_templates')
          .insert({
            title: formData.title,
            department: formData.department || null,
            description: formData.description || null,
            requirements: formData.requirements || null,
            salary_range: formData.salary_range || null,
            location: formData.location || null,
            total_rounds: formData.total_rounds,
            question_count: formData.question_count,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Template created successfully' });
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
    if (!selectedTemplate) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('job_templates')
        .delete()
        .eq('id', selectedTemplate.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Template deleted successfully' });
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

  const handleInstantiate = async () => {
    if (!selectedTemplate || !selectedCampaignId) return;
    setSubmitting(true);

    try {
      // Create a new job from the template
      const { error } = await supabase
        .from('jobs')
        .insert({
          title: selectedTemplate.title,
          department: selectedTemplate.department,
          description: selectedTemplate.description,
          requirements: selectedTemplate.requirements,
          salary_range: selectedTemplate.salary_range,
          location: selectedTemplate.location,
          total_rounds: selectedTemplate.total_rounds,
          question_count: selectedTemplate.question_count,
          is_active: false, // Start as inactive
          template_id: selectedTemplate.id,
          campaign_id: selectedCampaignId,
        });

      if (error) throw error;
      toast({ 
        title: 'Success', 
        description: `Job created from template in campaign successfully. You can now configure it in Job Management.` 
      });
      setInstantiateDialogOpen(false);
      setSelectedCampaignId('');
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
            <h1 className="text-3xl font-bold tracking-tight">Job Templates</h1>
            <p className="text-muted-foreground">Create reusable job templates for campaigns</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" /> Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{selectedTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
                  <DialogDescription>
                    {selectedTemplate 
                      ? 'Update template details' 
                      : 'Create a reusable job template that can be used across multiple campaigns'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Software Engineer"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        placeholder="e.g., Engineering"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g., Remote, New York"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Job description..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requirements">Requirements</Label>
                    <Textarea
                      id="requirements"
                      value={formData.requirements}
                      onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                      placeholder="Job requirements..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="salary_range">Salary Range</Label>
                      <Input
                        id="salary_range"
                        value={formData.salary_range}
                        onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                        placeholder="e.g., $80k-$120k"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="total_rounds">Total Rounds</Label>
                      <Input
                        id="total_rounds"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.total_rounds}
                        onChange={(e) => setFormData({ ...formData, total_rounds: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="question_count">Questions</Label>
                      <Input
                        id="question_count"
                        type="number"
                        min="1"
                        max="100"
                        value={formData.question_count}
                        onChange={(e) => setFormData({ ...formData, question_count: parseInt(e.target.value) || 10 })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active Template</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedTemplate ? 'Save Changes' : 'Create Template'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Templates</CardTitle>
            <CardDescription>
              {templates.length} template{templates.length !== 1 ? 's' : ''} created
            </CardDescription>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No templates created yet</p>
                <Button className="mt-4" onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" /> Create Your First Template
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Rounds</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="font-medium">{template.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>{template.department || '-'}</TableCell>
                      <TableCell>
                        {template.location ? (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {template.location}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{template.total_rounds || 1}</TableCell>
                      <TableCell>
                        <Badge variant={template.is_active ? 'default' : 'secondary'}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setInstantiateDialogOpen(true);
                            }}
                            disabled={campaigns.length === 0}
                            title={campaigns.length === 0 ? 'Create a campaign first' : 'Create job from template'}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Use
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(template)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedTemplate?.title}"? This action cannot be undone.
                Jobs created from this template will not be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Instantiate Dialog */}
        <Dialog open={instantiateDialogOpen} onOpenChange={setInstantiateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Job from Template</DialogTitle>
              <DialogDescription>
                Select a campaign to create a new job from the "{selectedTemplate?.title}" template.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <Label htmlFor="campaign">Select Campaign *</Label>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose a campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {campaigns.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  No active campaigns found. Create a campaign first.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInstantiateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleInstantiate} 
                disabled={submitting || !selectedCampaignId}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Briefcase className="mr-2 h-4 w-4" />
                Create Job
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  );
}
