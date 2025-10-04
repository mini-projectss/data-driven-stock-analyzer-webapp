import React from 'react';
import { AuthForm } from '../components/auth/AuthForm';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  return (
    <div className="min-h-screen brand-gradient">
      <AuthForm onAuthSuccess={onAuthSuccess} />
    </div>
  );
}