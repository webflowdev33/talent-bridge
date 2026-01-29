import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Briefcase } from 'lucide-react';

export interface Experience {
  company: string;
  position: string;
  description: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface ExperienceSectionProps {
  experience: Experience[];
  onChange: (experience: Experience[]) => void;
}

export function ExperienceSection({ experience, onChange }: ExperienceSectionProps) {
  const addExperience = () => {
    onChange([...experience, { company: '', position: '', description: '', start_date: '', end_date: '', is_current: false }]);
  };

  const removeExperience = (index: number) => {
    onChange(experience.filter((_, i) => i !== index));
  };

  const updateExperience = (index: number, field: keyof Experience, value: string | boolean) => {
    const updated = experience.map((exp, i) => 
      i === index ? { ...exp, [field]: value } : exp
    );
    onChange(updated);
  };

  return (
    <Card className="border border-border shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Briefcase className="h-5 w-5" />
              Work Experience
            </CardTitle>
            <CardDescription>
              Add your professional experience
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addExperience}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {experience.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No experience added yet. Click "Add" to add your work experience.
          </p>
        ) : (
          experience.map((exp, index) => (
            <div key={index} className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-muted-foreground">Experience #{index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeExperience(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Company *</Label>
                  <Input
                    value={exp.company}
                    onChange={(e) => updateExperience(index, 'company', e.target.value)}
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Position *</Label>
                  <Input
                    value={exp.position}
                    onChange={(e) => updateExperience(index, 'position', e.target.value)}
                    placeholder="Job title"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={exp.description}
                  onChange={(e) => updateExperience(index, 'description', e.target.value)}
                  placeholder="Brief description of your responsibilities"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="month"
                    value={exp.start_date}
                    onChange={(e) => updateExperience(index, 'start_date', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="month"
                    value={exp.end_date}
                    onChange={(e) => updateExperience(index, 'end_date', e.target.value)}
                    disabled={exp.is_current}
                  />
                </div>
                <div className="flex items-center space-x-2 pb-2">
                  <Switch
                    checked={exp.is_current}
                    onCheckedChange={(checked) => {
                      updateExperience(index, 'is_current', checked);
                      if (checked) {
                        updateExperience(index, 'end_date', '');
                      }
                    }}
                  />
                  <Label className="text-xs">Currently working here</Label>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
