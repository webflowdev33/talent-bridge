import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { TrendingDown, Users } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  total_rounds: number | null;
}

interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
  dropOff: number;
}

const chartConfig: ChartConfig = {
  count: {
    label: 'Candidates',
    color: 'hsl(var(--primary))',
  },
};

const STAGE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(210, 70%, 55%)',
  'hsl(180, 60%, 45%)',
  'hsl(150, 60%, 40%)',
  'hsl(var(--success))',
];

export function CandidateFunnel() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    fetchFunnelData();
  }, [selectedJob]);

  const fetchJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('id, title, total_rounds')
      .eq('is_active', true)
      .order('title');
    setJobs(data || []);
  };

  const fetchFunnelData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('applications').select('id, status, current_round, admin_approved, job_id');
      
      if (selectedJob !== 'all') {
        query = query.eq('job_id', selectedJob);
      }

      const { data: applications, error } = await query;
      if (error) throw error;

      const apps = applications || [];
      const totalApplied = apps.length;
      
      // Count by stage
      const approved = apps.filter(a => a.admin_approved).length;
      const inRound1 = apps.filter(a => a.admin_approved && a.current_round >= 1 && a.status !== 'rejected').length;
      const inRound2 = apps.filter(a => a.current_round >= 2 && a.status !== 'rejected').length;
      const inRound3 = apps.filter(a => a.current_round >= 3 && a.status !== 'rejected').length;
      const selected = apps.filter(a => a.status === 'selected').length;

      const stages = [
        { stage: 'Applied', count: totalApplied },
        { stage: 'Approved', count: approved },
        { stage: 'Round 1', count: inRound1 },
        { stage: 'Round 2', count: inRound2 },
        { stage: 'Round 3', count: inRound3 },
        { stage: 'Selected', count: selected },
      ];

      // Calculate percentages and drop-off
      const funnelWithStats: FunnelData[] = stages.map((s, i) => ({
        ...s,
        percentage: totalApplied > 0 ? Math.round((s.count / totalApplied) * 100) : 0,
        dropOff: i > 0 && stages[i - 1].count > 0 
          ? Math.round(((stages[i - 1].count - s.count) / stages[i - 1].count) * 100)
          : 0,
      }));

      setFunnelData(funnelWithStats);
    } catch (error) {
      console.error('Error fetching funnel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const overallConversionRate = funnelData.length > 0 && funnelData[0].count > 0
    ? Math.round((funnelData[funnelData.length - 1].count / funnelData[0].count) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Candidate Funnel</CardTitle>
          <CardDescription>Conversion rates through hiring stages</CardDescription>
        </div>
        <Select value={selectedJob} onValueChange={setSelectedJob}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {jobs.map(job => (
              <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-[300px] w-full" />
          </div>
        ) : funnelData[0]?.count === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p>No applications to display</p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{funnelData[0]?.count || 0}</p>
                <p className="text-xs text-muted-foreground">Total Applied</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-success">{funnelData[funnelData.length - 1]?.count || 0}</p>
                <p className="text-xs text-muted-foreground">Selected</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{overallConversionRate}%</p>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
              </div>
            </div>

            {/* Funnel Chart */}
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={funnelData} 
                  layout="vertical"
                  margin={{ top: 0, right: 80, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="stage" 
                    type="category" 
                    axisLine={false}
                    tickLine={false}
                    width={80}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip 
                    content={
                      <ChartTooltipContent 
                        formatter={(value, name, props) => (
                          <div className="flex flex-col gap-1">
                            <span>{value} candidates</span>
                            <span className="text-muted-foreground text-xs">
                              {props.payload.percentage}% of total
                            </span>
                            {props.payload.dropOff > 0 && (
                              <span className="text-destructive text-xs flex items-center gap-1">
                                <TrendingDown className="h-3 w-3" />
                                {props.payload.dropOff}% drop-off
                              </span>
                            )}
                          </div>
                        )}
                      />
                    }
                  />
                  <Bar 
                    dataKey="count" 
                    radius={[0, 4, 4, 0]}
                    maxBarSize={40}
                  >
                    {funnelData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STAGE_COLORS[index % STAGE_COLORS.length]}
                        fillOpacity={0.9}
                      />
                    ))}
                    <LabelList 
                      dataKey="count" 
                      position="right" 
                      formatter={(value: number) => value}
                      className="fill-foreground text-sm font-medium"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Drop-off indicators */}
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Stage Drop-off Rates</p>
              <div className="flex flex-wrap gap-2">
                {funnelData.slice(1).map((stage, i) => (
                  <div key={stage.stage} className="flex items-center gap-1 text-xs px-2 py-1 bg-muted rounded">
                    <span>{funnelData[i].stage} → {stage.stage}:</span>
                    <span className={stage.dropOff > 50 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                      -{stage.dropOff}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
