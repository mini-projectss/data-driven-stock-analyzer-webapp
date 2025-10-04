import React from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface HeroSectionProps {
  onStartAnalysis?: () => void;
}

export function HeroSection({ onStartAnalysis }: HeroSectionProps) {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <h1 className="text-5xl lg:text-6xl leading-tight">
              <span className="text-white">The Future of Finance is </span>
              <span className="text-transparent bg-gradient-to-r from-accent-teal to-cyan-400 bg-clip-text">
                Predictive.
              </span>
            </h1>
            
            <p className="text-xl text-neutral-text/80 leading-relaxed">
              AI + LSTM with classical models for explainable stock forecasting.
            </p>
            
            <Button 
              size="lg"
              onClick={onStartAnalysis}
              className="bg-accent-teal hover:bg-accent-teal/90 text-white text-lg px-8 py-4 h-auto"
              style={{ backgroundColor: 'var(--accent-teal)' }}
            >
              Start Free Analysis
            </Button>
          </div>

          {/* Right Visualization */}
          <div className="relative">
            {/* Main Chart Container */}
            <div className="glass-card soft-shadow rounded-2xl p-6 relative overflow-hidden">
              {/* Animated Chart Visualization */}
              <div className="h-80 flex items-end justify-between space-x-2">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-gradient-to-t from-accent-teal/60 to-accent-teal animate-pulse rounded-t"
                    style={{
                      height: `${Math.random() * 80 + 20}%`,
                      animationDelay: `${i * 100}ms`,
                      backgroundColor: i % 3 === 0 ? 'var(--success-green)' : 'var(--accent-teal)',
                      width: '100%'
                    }}
                  />
                ))}
              </div>
              
              {/* Chart Labels */}
              <div className="flex justify-between mt-4 text-sm text-neutral-text/60">
                <span>Jan</span>
                <span>Mar</span>
                <span>Jun</span>
                <span>Sep</span>
                <span>Dec</span>
              </div>
            </div>

            {/* Prediction Overlay Card */}
            <Card className="absolute -bottom-6 -right-6 glass-card border-accent-teal/30 p-4 min-w-fit">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-success-green/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-success-green" style={{ color: 'var(--success-green)' }} />
                </div>
                <div>
                  <p className="text-sm text-neutral-text/80">Today's prediction</p>
                  <p className="text-lg font-semibold text-success-green" style={{ color: 'var(--success-green)' }}>
                    TCS +1.9%
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}