import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Briefcase, 
  Users, 
  ClipboardCheck, 
  Trophy, 
  ArrowRight,
  Shield,
  Clock,
  BarChart3,
  CheckCircle2
} from 'lucide-react';

export default function Index() {
  const features = [
    {
      icon: ClipboardCheck,
      title: 'Smart Assessments',
      description: 'AI-powered aptitude tests with randomized questions to ensure fair evaluation.',
    },
    {
      icon: Shield,
      title: 'Secure Testing',
      description: 'Full-screen mode, tab switch detection, and anti-cheating measures.',
    },
    {
      icon: Clock,
      title: 'Timed Evaluations',
      description: 'Auto-submit on timer end with countdown visibility for candidates.',
    },
    {
      icon: BarChart3,
      title: 'Detailed Analytics',
      description: 'Comprehensive reports on candidate performance and test violations.',
    },
  ];

  const steps = [
    { number: '01', title: 'Create Profile', description: 'Complete your profile and upload your resume' },
    { number: '02', title: 'Apply for Jobs', description: 'Browse and apply for available positions' },
    { number: '03', title: 'Select Time Slot', description: 'Choose your preferred test time slot' },
    { number: '04', title: 'Take the Test', description: 'Complete the aptitude test in secure mode' },
    { number: '05', title: 'View Results', description: 'Check your results and next round status' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero py-24 lg:py-32">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDE0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl animate-slide-up">
              Streamline Your{' '}
              <span className="text-gradient bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
                Hiring Process
              </span>
            </h1>
            <p className="mt-6 text-lg text-white/80 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Conduct secure, AI-powered aptitude tests and multi-round interviews. 
              Find the best talent with our intelligent assessment platform.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Button variant="hero" size="xl" asChild className="bg-white text-primary hover:bg-white/90">
                <Link to="/jobs">
                  Browse Jobs
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                <Link to="/auth?tab=signup">Create Account</Link>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-background border-b">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Companies', value: '500+' },
              { label: 'Candidates Tested', value: '50K+' },
              { label: 'Success Rate', value: '94%' },
              { label: 'Tests Conducted', value: '100K+' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-display font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold">Why Choose Testrow?</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Our platform provides everything you need for efficient and secure candidate assessment.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="font-display text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold">How It Works</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Our streamlined process makes it easy to apply and get assessed.
            </p>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                <div className="text-center p-6 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <div className="text-4xl font-display font-bold text-primary/20 mb-2">
                    {step.number}
                  </div>
                  <h3 className="font-display font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero">
        <div className="container text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-bold text-white mb-4">
              Ready to Find Your Next Opportunity?
            </h2>
            <p className="text-white/80 mb-8">
              Join thousands of candidates who have successfully landed their dream jobs through Testrow.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="lg" asChild className="bg-white text-primary hover:bg-white/90">
                <Link to="/auth?tab=signup">
                  Get Started Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                <Link to="/jobs">View Open Positions</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
