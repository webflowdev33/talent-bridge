import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function Index() {

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <section className="py-16 sm:py-24 md:py-32 lg:py-40 bg-background flex-1 flex items-center px-4 sm:px-6">
        <div className="container w-full">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-foreground mb-4 sm:mb-6 px-2">
              Appsrow Walk-In Interview Portal
            </h1>
            <h2 className="mt-4 sm:mt-6 text-xl sm:text-2xl md:text-3xl font-semibold text-foreground max-w-3xl mx-auto leading-relaxed px-4">
              Register, book your interview slot, and track your interview progress in one place
            </h2>
            <p className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
              This portal is created for IT freshers and internship seekers to apply for the Appsrow Walk-In Interview, appear for the aptitude test, attend interview rounds, and view results.
            </p>
            <div className="mt-8 sm:mt-10 md:mt-12 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0">
              <Button 
                size="lg" 
                asChild 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold px-6 sm:px-8 py-5 sm:py-6 text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 w-full sm:w-auto"
              >
                <Link to="/auth?tab=signup" className="flex items-center justify-center">
                  Apply for Walk-In Interview
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                asChild 
                className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold px-6 sm:px-8 py-5 sm:py-6 text-sm sm:text-base transition-all duration-300 hover:scale-105 w-full sm:w-auto"
              >
                <Link to="/jobs" className="flex items-center justify-center">
                  View Open Roles
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
