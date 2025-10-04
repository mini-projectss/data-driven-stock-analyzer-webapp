import React from 'react';
import { Card } from '../ui/card';
import { Brain, Gauge, TrendingUp } from 'lucide-react';

export function FeaturesSection() {
  const features = [
    {
      icon: Brain,
      title: 'Dual-Model Prediction',
      description: 'Combines AI neural networks with classical financial models for accurate forecasting with explainable results.'
    },
    {
      icon: Gauge,
      title: 'Sentiment Analysis',
      description: 'Real-time market sentiment tracking from news, social media, and financial reports to enhance predictions.'
    },
    {
      icon: TrendingUp,
      title: 'Trend Tracking',
      description: 'Advanced technical indicators and pattern recognition to identify market trends and trading opportunities.'
    }
  ];

  return (
    <section className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl mb-4 text-white">
            Advanced Analytics Platform
          </h2>
          <p className="text-xl text-neutral-text/80 max-w-2xl mx-auto">
            Powered by cutting-edge AI and traditional financial analysis
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="glass-card soft-shadow p-8 hover:scale-105 transition-transform duration-300">
              <div className="space-y-6">
                {/* Icon with mock visualization */}
                <div className="space-y-4">
                  <div className="p-4 bg-accent-teal/20 rounded-2xl w-fit">
                    <feature.icon className="w-8 h-8 text-accent-teal" style={{ color: 'var(--accent-teal)' }} />
                  </div>
                  
                  {/* Feature-specific mock visualization */}
                  {feature.title === 'Sentiment Analysis' && (
                    <div className="h-16 w-16 rounded-full border-4 border-accent-teal/30 relative">
                      <div 
                        className="absolute inset-2 rounded-full bg-gradient-to-r from-success-green to-accent-teal"
                        style={{
                          background: `conic-gradient(var(--success-green) 70%, var(--accent-teal) 70%)`
                        }}
                      />
                      <div className="absolute inset-4 rounded-full bg-card flex items-center justify-center">
                        <span className="text-xs font-semibold text-success-green">70%</span>
                      </div>
                    </div>
                  )}
                  
                  {feature.title === 'Trend Tracking' && (
                    <div className="flex items-end space-x-1 h-12">
                      {[3, 7, 5, 9, 6, 11, 8, 12].map((height, i) => (
                        <div
                          key={i}
                          className="w-2 bg-accent-teal/60 rounded-t"
                          style={{ 
                            height: `${height * 3}px`,
                            backgroundColor: i > 4 ? 'var(--success-green)' : 'var(--accent-teal)'
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xl mb-3 text-white">{feature.title}</h3>
                  <p className="text-neutral-text/80 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}