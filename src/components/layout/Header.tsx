import React from 'react';
import { Button } from '../ui/button';
import exampleImage from 'figma:asset/0dd8719a28e6e6e3bc4e70218a8dff6075f23811.png';

interface HeaderProps {
  onLoginClick?: () => void;
  onSignupClick?: () => void;
}

export function Header({ onLoginClick, onSignupClick }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img 
            src={exampleImage}
            alt="Data-Driven Stock Analyzer Logo"
            className="w-10 h-10 rounded-lg"
          />
          <span className="text-xl font-semibold text-neutral-text">
            Data-Driven Stock Analyzer
          </span>
        </div>
        
        <nav className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={onLoginClick}
            className="text-neutral-text hover:text-white hover:bg-white/10"
          >
            Login
          </Button>
          <Button 
            onClick={onSignupClick}
            className="bg-accent-teal hover:bg-accent-teal/90 text-white"
            style={{ backgroundColor: 'var(--accent-teal)' }}
          >
            Start Free Analysis
          </Button>
        </nav>
      </div>
    </header>
  );
}