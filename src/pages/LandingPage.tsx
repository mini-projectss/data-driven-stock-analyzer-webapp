import React from 'react';
import { Header } from '../components/layout/Header';
import { HeroSection } from '../components/landing/HeroSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { TrustBand } from '../components/landing/TrustBand';

interface LandingPageProps {
  onNavigateToAuth: () => void;
}

export function LandingPage({ onNavigateToAuth }: LandingPageProps) {
  return (
    <div className="min-h-screen brand-gradient">
      <Header 
        onLoginClick={onNavigateToAuth}
        onSignupClick={onNavigateToAuth}
      />
      
      <main>
        <HeroSection onStartAnalysis={onNavigateToAuth} />
        <FeaturesSection />
        <TrustBand />
      </main>

      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-neutral-text/80">
                <li><a href="#" className="hover:text-accent-teal transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-accent-teal transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-accent-teal transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-neutral-text/80">
                <li><a href="#" className="hover:text-accent-teal transition-colors">About</a></li>
                <li><a href="#" className="hover:text-accent-teal transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-accent-teal transition-colors">Careers</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-neutral-text/80">
                <li><a href="#" className="hover:text-accent-teal transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-accent-teal transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-accent-teal transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-neutral-text/60">
            <p>&copy; 2024 Data-Driven Stock Analyzer. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}