import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, Sparkles } from 'lucide-react';

interface SkillsSectionProps {
  skills: string[];
  onChange: (skills: string[]) => void;
}

export function SkillsSection({ skills, onChange }: SkillsSectionProps) {
  const [newSkill, setNewSkill] = useState('');

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed]);
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    onChange(skills.filter((s) => s !== skill));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  return (
    <Card className="border border-border shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Sparkles className="h-5 w-5" />
          Skills
        </CardTitle>
        <CardDescription>
          Add your technical and professional skills
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a skill and press Enter"
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={addSkill}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {skills.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No skills added yet. Type a skill above and press Enter to add.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="px-3 py-1 text-sm flex items-center gap-1"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
