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
              Streamline Your{' '}
              <span className="text-primary block sm:inline">
                Hiring Process
              </span>
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
              Conduct secure, AI-powered aptitude tests and multi-round interviews. 
              Find the best talent with our intelligent assessment platform.
            </p>
            <div className="mt-8 sm:mt-10 md:mt-12 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0">
              <Button 
                size="lg" 
                asChild 
                className="bg-primary text-white hover:bg-primary/90 font-semibold px-6 sm:px-8 py-5 sm:py-6 text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 w-full sm:w-auto"
              >
                <Link to="/jobs" className="flex items-center justify-center">
                  Browse Jobs
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                asChild 
                className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold px-6 sm:px-8 py-5 sm:py-6 text-sm sm:text-base transition-all duration-300 hover:scale-105 w-full sm:w-auto"
              >
                <Link to="/auth?tab=signup" className="flex items-center justify-center">
                  Create Account
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
