import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
                <Briefcase className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-foreground">
                TalentFlow
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Streamline your hiring process with our intelligent aptitude testing platform.
            </p>
          </div>

          <div>
            <h3 className="font-display font-semibold mb-4">Platform</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/jobs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Job Openings
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold mb-4">For Candidates</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/auth?tab=signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} TalentFlow. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
