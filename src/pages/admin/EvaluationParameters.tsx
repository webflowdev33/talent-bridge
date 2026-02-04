import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, Target } from 'lucide-react';

interface EvaluationParameter {
  id: string;
  name: string;
  description: string | null;
  max_score: number;
  is_active: boolean;
  created_at: string;
}

interface ParameterFormData {
  name: string;
  description: string;
  max_score: number;
  is_active: boolean;
}

const defaultFormData: ParameterFormData = {
  name: '',
  description: '',
  max_score: 10,
  is_active: true,
};

export default function EvaluationParameters() {
  const [parameters, setParameters] = useState<EvaluationParameter[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedParameter, setSelectedParameter] = useState<EvaluationParameter | null>(null);
  const [formData, setFormData] = useState<ParameterFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchParameters();
  }, []);

  const fetchParameters = async () => {
    try {
      const { data, error } = await supabase
        .from('evaluation_parameters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParameters(data || []);
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

  const handleOpenDialog = (parameter?: EvaluationParameter) => {
    if (parameter) {
      setSelectedParameter(parameter);
      setFormData({
        name: parameter.name,
        description: parameter.description || '',
        max_score: parameter.max_score,
        is_active: parameter.is_active,
      });
    } else {
      setSelectedParameter(null);
      setFormData(defaultFormData);
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (selectedParameter) {
        const { error } = await supabase
          .from('evaluation_parameters')
          .update({
            name: formData.name,
            description: formData.description || null,
            max_score: formData.max_score,
            is_active: formData.is_active,
          })
          .eq('id', selectedParameter.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Parameter updated successfully' });
      } else {
        const { error } = await supabase
          .from('evaluation_parameters')
          .insert({
            name: formData.name,
            description: formData.description || null,
            max_score: formData.max_score,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Parameter created successfully' });
      }

      setDialogOpen(false);
      fetchParameters();
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
    if (!selectedParameter) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('evaluation_parameters')
        .delete()
        .eq('id', selectedParameter.id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Parameter deleted successfully' });
      setDeleteDialogOpen(false);
      fetchParameters();
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

  const toggleParameterStatus = async (parameter: EvaluationParameter) => {
    try {
      const { error } = await supabase
        .from('evaluation_parameters')
        .update({ is_active: !parameter.is_active })
        .eq('id', parameter.id);

      if (error) throw error;
      fetchParameters();
      toast({
        title: 'Success',
        description: `Parameter ${!parameter.is_active ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Evaluation Parameters</h1>
            <p className="text-muted-foreground">Define criteria for evaluating candidates</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" /> Add Parameter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{selectedParameter ? 'Edit Parameter' : 'Add Evaluation Parameter'}</DialogTitle>
                  <DialogDescription>
                    {selectedParameter ? 'Update parameter details' : 'Create a new evaluation criteria'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Parameter Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Technical Skills, Communication"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="What should be evaluated under this parameter?"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_score">Maximum Score</Label>
                    <Input
                      id="max_score"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.max_score}
                      onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) || 10 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Score range will be 0 to {formData.max_score}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active (available for evaluations)</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {selectedParameter ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              All Parameters
            </CardTitle>
            <CardDescription>
              {parameters.length} parameter{parameters.length !== 1 ? 's' : ''} defined
            </CardDescription>
          </CardHeader>
          <CardContent>
            {parameters.length === 0 ? (
              <div className="text-center py-8">
                <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No evaluation parameters yet</p>
                <Button className="mt-4" onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" /> Add Your First Parameter
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Max Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parameters.map((param) => (
                    <TableRow key={param.id}>
                      <TableCell className="font-medium">{param.name}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {param.description || '-'}
                      </TableCell>
                      <TableCell>{param.max_score}</TableCell>
                      <TableCell>
                        <Badge variant={param.is_active ? 'default' : 'secondary'}>
                          {param.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Switch
                            checked={param.is_active}
                            onCheckedChange={() => toggleParameterStatus(param)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(param)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedParameter(param);
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
      

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Parameter</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedParameter?.name}"? This will also delete all associated evaluation scores.
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

      </div>
    </AdminLayout>
  );
}
