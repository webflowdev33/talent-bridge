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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, FileText, Loader2, MapPin, Copy, Briefcase, GripVertical, Layers } from 'lucide-react';

interface TemplateRound {
  id?: string;
  round_number: number;
  name: string;
  mode: string;
  description: string;
  instructions: string;
}

interface JobTemplate {
  id: string;
  title: string;
  department: string | null;
  description: string | null;
  location: string | null;
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
  location: string;
  question_count: number;
  is_active: boolean;
}

const ROUND_MODES = [
  { value: 'online_aptitude', label: 'Online Aptitude' },
  { value: 'online_technical', label: 'Online Technical' },
  { value: 'in_person', label: 'In-Person' },
  { value: 'interview', label: 'Interview' },
  { value: 'hr_round', label: 'HR Round' },
];

const defaultFormData: TemplateFormData = {
  title: '',
  department: '',
  description: '',
  location: '',
  question_count: 10,
  is_active: true,
};

const defaultRound: TemplateRound = {
  round_number: 1,
  name: '',
  mode: 'online_aptitude',
  description: '',
  instructions: '',
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
  const [templateRounds, setTemplateRounds] = useState<TemplateRound[]>([]);
  const [templateRoundCounts, setTemplateRoundCounts] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, campaignsRes, roundsRes] = await Promise.all([
        supabase
          .from('job_templates')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('campaigns')
          .select('id, name, is_active')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('template_rounds')
          .select('template_id'),
      ]);

      if (templatesRes.error) throw templatesRes.error;
      if (campaignsRes.error) throw campaignsRes.error;
      if (roundsRes.error) throw roundsRes.error;

      // Count rounds per template
      const counts: Record<string, number> = {};
      roundsRes.data?.forEach((r) => {
        counts[r.template_id] = (counts[r.template_id] || 0) + 1;
      });

      setTemplates(templatesRes.data || []);
      setCampaigns(campaignsRes.data || []);
      setTemplateRoundCounts(counts);
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

  const fetchTemplateRounds = async (templateId: string) => {
    const { data, error } = await supabase
      .from('template_rounds')
      .select('*')
      .eq('template_id', templateId)
      .order('round_number');

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return [];
    }
    return data || [];
  };

  const handleOpenDialog = async (template?: JobTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setFormData({
        title: template.title,
        department: template.department || '',
        description: template.description || '',
        location: template.location || '',
        question_count: template.question_count ?? 10,
        is_active: template.is_active ?? true,
      });
      const rounds = await fetchTemplateRounds(template.id);
      setTemplateRounds(rounds.length > 0 ? rounds : [{ ...defaultRound }]);
    } else {
      setSelectedTemplate(null);
      setFormData(defaultFormData);
      setTemplateRounds([{ ...defaultRound }]);
    }
    setDialogOpen(true);
  };

  const handleAddRound = () => {
    setTemplateRounds([
      ...templateRounds,
      { ...defaultRound, round_number: templateRounds.length + 1 },
    ]);
  };

  const handleRemoveRound = (index: number) => {
    if (templateRounds.length <= 1) return;
    const updated = templateRounds.filter((_, i) => i !== index).map((r, i) => ({
      ...r,
      round_number: i + 1,
    }));
    setTemplateRounds(updated);
  };

  const handleRoundChange = (index: number, field: keyof TemplateRound, value: string | number) => {
    const updated = [...templateRounds];
    updated[index] = { ...updated[index], [field]: value };
    setTemplateRounds(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let templateId: string;

      if (selectedTemplate) {
        const { error } = await supabase
          .from('job_templates')
          .update({
            title: formData.title,
            department: formData.department || null,
            description: formData.description || null,
            location: formData.location || null,
            question_count: formData.question_count,
            is_active: formData.is_active,
          })
          .eq('id', selectedTemplate.id);

        if (error) throw error;
        templateId = selectedTemplate.id;

        // Delete existing rounds and re-insert
        await supabase.from('template_rounds').delete().eq('template_id', templateId);
      } else {
        const { data, error } = await supabase
          .from('job_templates')
          .insert({
            title: formData.title,
            department: formData.department || null,
            description: formData.description || null,
            location: formData.location || null,
            question_count: formData.question_count,
            is_active: formData.is_active,
          })
          .select('id')
          .single();

        if (error) throw error;
        templateId = data.id;
      }

      // Insert rounds
      if (templateRounds.length > 0) {
        const roundsToInsert = templateRounds.map((r, index) => ({
          template_id: templateId,
          round_number: index + 1,
          name: r.name || `Round ${index + 1}`,
          mode: r.mode,
          description: r.description || null,
          instructions: r.instructions || null,
        }));

        const { error: roundsError } = await supabase.from('template_rounds').insert(roundsToInsert);
        if (roundsError) throw roundsError;
      }

      toast({ title: 'Success', description: selectedTemplate ? 'Template updated successfully' : 'Template created successfully' });
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
      // Fetch template rounds
      const rounds = await fetchTemplateRounds(selectedTemplate.id);

      // Create a new job from the template
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .insert({
          title: selectedTemplate.title,
          department: selectedTemplate.department,
          description: selectedTemplate.description,
          location: selectedTemplate.location,
          question_count: selectedTemplate.question_count ?? 10,
          is_active: false,
          template_id: selectedTemplate.id,
          campaign_id: selectedCampaignId,
          total_rounds: rounds.length || 1,
        })
        .select('id')
        .single();

      if (jobError) throw jobError;

      // Copy template rounds to job_rounds
      if (rounds.length > 0) {
        const jobRoundsToInsert = rounds.map((r) => ({
          job_id: jobData.id,
          round_number: r.round_number,
          name: r.name,
          mode: r.mode,
          description: r.description,
          instructions: r.instructions,
        }));

        const { error: roundsError } = await supabase.from('job_rounds').insert(jobRoundsToInsert);
        if (roundsError) throw roundsError;
      }

      toast({ 
        title: 'Success', 
        description: `Job created from template with ${rounds.length} round(s). Configure it in Job Management.` 
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
            <p className="text-muted-foreground">Create reusable job templates with rounds for campaigns</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" /> Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{selectedTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
                  <DialogDescription>
                    {selectedTemplate 
                      ? 'Update template details and rounds' 
                      : 'Create a reusable job template with defined rounds'}
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
                    <Label htmlFor="question_count">Questions per Test</Label>
                    <Input
                      id="question_count"
                      type="number"
                      min={1}
                      max={100}
                      value={formData.question_count}
                      onChange={(e) => setFormData({ ...formData, question_count: parseInt(e.target.value) || 10 })}
                      placeholder="Number of questions"
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of questions to display during aptitude/technical tests
                    </p>
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

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active Template</Label>
                  </div>

                  {/* Rounds Section */}
                  <div className="border-t pt-4 mt-2">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        <Label className="text-base font-semibold">Hiring Rounds</Label>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddRound}>
                        <Plus className="h-4 w-4 mr-1" /> Add Round
                      </Button>
                    </div>

                    <Accordion type="multiple" defaultValue={templateRounds.map((_, i) => `round-${i}`)} className="space-y-2">
                      {templateRounds.map((round, index) => (
                        <AccordionItem key={index} value={`round-${index}`} className="border rounded-lg px-4">
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <Badge variant="secondary">Round {index + 1}</Badge>
                              <span className="text-sm font-medium">
                                {round.name || `Round ${index + 1}`}
                              </span>
                              <Badge variant="outline" className="ml-2">
                                {ROUND_MODES.find(m => m.value === round.mode)?.label || round.mode}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-4 pb-2">
                            <div className="grid gap-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Round Name *</Label>
                                  <Input
                                    value={round.name}
                                    onChange={(e) => handleRoundChange(index, 'name', e.target.value)}
                                    placeholder="e.g., Technical Interview"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Mode</Label>
                                  <Select
                                    value={round.mode}
                                    onValueChange={(value) => handleRoundChange(index, 'mode', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ROUND_MODES.map((mode) => (
                                        <SelectItem key={mode.value} value={mode.value}>
                                          {mode.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                  value={round.description}
                                  onChange={(e) => handleRoundChange(index, 'description', e.target.value)}
                                  placeholder="Brief description of this round..."
                                  rows={2}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Instructions for Candidate</Label>
                                <Textarea
                                  value={round.instructions}
                                  onChange={(e) => handleRoundChange(index, 'instructions', e.target.value)}
                                  placeholder="Instructions visible to candidates..."
                                  rows={2}
                                />
                              </div>
                              {templateRounds.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive w-fit"
                                  onClick={() => handleRemoveRound(index)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" /> Remove Round
                                </Button>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
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
                      <TableCell>
                        <Badge variant="outline">
                          <Layers className="h-3 w-3 mr-1" />
                          {templateRoundCounts[template.id] || 0} rounds
                        </Badge>
                      </TableCell>
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
                {templateRoundCounts[selectedTemplate?.id || ''] > 0 && (
                  <span className="block mt-1 text-primary">
                    This template includes {templateRoundCounts[selectedTemplate?.id || '']} predefined round(s).
                  </span>
                )}
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
