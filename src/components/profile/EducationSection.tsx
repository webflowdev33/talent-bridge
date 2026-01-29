import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, GraduationCap } from 'lucide-react';

export interface Education {
  institution: string;
  degree: string;
  field_of_study: string;
  start_year: string;
  end_year: string;
}

interface EducationSectionProps {
  education: Education[];
  onChange: (education: Education[]) => void;
}

export function EducationSection({ education, onChange }: EducationSectionProps) {
  const addEducation = () => {
    onChange([...education, { institution: '', degree: '', field_of_study: '', start_year: '', end_year: '' }]);
  };

  const removeEducation = (index: number) => {
    onChange(education.filter((_, i) => i !== index));
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    const updated = education.map((edu, i) => 
      i === index ? { ...edu, [field]: value } : edu
    );
    onChange(updated);
  };

  return (
    <Card className="border border-border shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <GraduationCap className="h-5 w-5" />
              Education
            </CardTitle>
            <CardDescription>
              Add your educational background
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addEducation}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {education.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No education added yet. Click "Add" to add your education.
          </p>
        ) : (
          education.map((edu, index) => (
            <div key={index} className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-muted-foreground">Education #{index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => removeEducation(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Institution *</Label>
                  <Input
                    value={edu.institution}
                    onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                    placeholder="University/College name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Degree *</Label>
                  <Input
                    value={edu.degree}
                    onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                    placeholder="e.g., Bachelor's, Master's"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Field of Study</Label>
                  <Input
                    value={edu.field_of_study}
                    onChange={(e) => updateEducation(index, 'field_of_study', e.target.value)}
                    placeholder="e.g., Computer Science"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Start Year</Label>
                    <Input
                      type="number"
                      min="1950"
                      max="2030"
                      value={edu.start_year}
                      onChange={(e) => updateEducation(index, 'start_year', e.target.value)}
                      placeholder="2020"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End Year</Label>
                    <Input
                      type="number"
                      min="1950"
                      max="2030"
                      value={edu.end_year}
                      onChange={(e) => updateEducation(index, 'end_year', e.target.value)}
                      placeholder="2024"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
