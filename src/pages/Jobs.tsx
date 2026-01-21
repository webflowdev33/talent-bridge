import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Clock, 
  Search,
  Building2,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  department: string | null;
  location: string | null;
  salary_range: string | null;
  total_rounds: number | null;
  created_at: string;
}

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-primary py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-5xl font-bold text-white mb-6">
              Find Your Dream Job
            </h1>
            <p className="text-white/90 mb-10 text-lg">
              Explore our open positions and take the first step towards your new career.
            </p>
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
              <Input
                placeholder="Search jobs by title, department, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 bg-white border-0 shadow-xl text-base focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Jobs List */}
      <section className="py-20 bg-secondary flex-1">
        <div className="container">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 mb-6">
                <img src="/logo.svg" alt="Testrow Logo" className="h-20 w-20" />
              </div>
              <h3 className="font-display text-2xl font-bold text-foreground mb-3">No Jobs Found</h3>
              <p className="text-muted-foreground text-lg">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'Check back later for new opportunities'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-10">
                <p className="text-foreground text-lg">
                  Showing <span className="font-bold text-primary">{filteredJobs.length}</span> open position{filteredJobs.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="grid gap-6">
                {filteredJobs.map((job) => (
                  <Card 
                    key={job.id} 
                    className="border border-border shadow-md hover:shadow-xl transition-all duration-300 bg-background hover:border-primary/30"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="font-display text-2xl font-bold text-foreground mb-3">
                            {job.title}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            {job.department && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                                <span className="font-medium">{job.department}</span>
                              </div>
                            )}
                            {job.location && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span className="font-medium">{job.location}</span>
                              </div>
                            )}
                            {job.salary_range && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <DollarSign className="h-4 w-4" />
                                <span className="font-medium">{job.salary_range}</span>
                              </div>
                            )}
                            {job.total_rounds && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">{job.total_rounds} Round{job.total_rounds > 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className="shrink-0 bg-primary w-fit text-center text-white px-3 py-1.5 font-semibold">
                          Active
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {job.description && (
                        <CardDescription className="mb-6 line-clamp-2 text-base leading-relaxed">
                          {job.description}
                        </CardDescription>
                      )}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground font-medium">
                          Posted {new Date(job.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        {user ? (
                          <Button 
                            asChild 
                            className="bg-primary text-white hover:bg-primary/90 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            <Link to={`/jobs/${job.id}`}>
                              Apply Now
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        ) : (
                          <Button 
                            asChild 
                            variant="outline"
                            className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold transition-all duration-300"
                          >
                            <Link to="/auth?tab=signup">
                              Sign Up to Apply
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
