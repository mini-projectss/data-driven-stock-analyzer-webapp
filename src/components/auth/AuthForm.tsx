import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

// Firebase config (for reference)
const firebaseConfig = {
  apiKey: "AIzaSyCMxdihdCyXTl_OZ3aDZ84LX0sM_no7jWw",
  authDomain: "data-driven-stock-analyzer.firebaseapp.com",
  projectId: "data-driven-stock-analyzer",
  appId: "1:206028689023:web:5c36ab2b9aa30266b0794a"
};

interface AuthFormProps {
  onAuthSuccess?: () => void;
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const passwordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthColor = (strength: number) => {
    if (strength < 2) return 'var(--error-red)';
    if (strength < 4) return '#FF9800';
    return 'var(--success-green)';
  };

  const getPasswordStrengthText = (strength: number) => {
    if (strength < 2) return 'Weak';
    if (strength < 4) return 'Medium';
    return 'Strong';
  };

  const validateForm = (isSignup: boolean) => {
    const newErrors: Record<string, string> = {};

    if (isSignup && !formData.username) {
      newErrors.username = 'Username is required';
    }

    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Valid email is required';
    }

    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (isSignup && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (isSignup: boolean) => {
    if (!validateForm(isSignup)) return;

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onAuthSuccess?.();
    }, 1500);
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <Card className="glass-card soft-shadow w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl text-white mb-2">Welcome Back</h1>
          <p className="text-neutral-text/80">Sign in to your account or create a new one</p>
        </div>

        <Tabs defaultValue="login" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white/10">
            <TabsTrigger value="login" className="data-[state=active]:bg-accent-teal data-[state=active]:text-white">
              Login
            </TabsTrigger>
            <TabsTrigger value="signup" className="data-[state=active]:bg-accent-teal data-[state=active]:text-white">
              Signup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="login-email" className="text-neutral-text">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  className="mt-1 bg-input border-white/20 text-white placeholder:text-neutral-text/60"
                />
                {errors.email && (
                  <p className="text-sm text-error-red mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="login-password" className="text-neutral-text">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => updateFormData('password', e.target.value)}
                    className="bg-input border-white/20 text-white placeholder:text-neutral-text/60 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-text/60 hover:text-neutral-text"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-error-red mt-1">{errors.password}</p>
                )}
              </div>

              <div className="text-right">
                <button className="text-sm text-accent-teal hover:underline">
                  Forgot password?
                </button>
              </div>

              <Button
                onClick={() => handleSubmit(false)}
                disabled={isLoading}
                className="w-full bg-accent-teal hover:bg-accent-teal/90 text-white"
                style={{ backgroundColor: 'var(--accent-teal)' }}
              >
                {isLoading ? 'Signing in...' : 'Log in'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="signup-username" className="text-neutral-text">Username</Label>
                <Input
                  id="signup-username"
                  type="text"
                  placeholder="Choose a username"
                  value={formData.username}
                  onChange={(e) => updateFormData('username', e.target.value)}
                  className="mt-1 bg-input border-white/20 text-white placeholder:text-neutral-text/60"
                />
                {errors.username && (
                  <p className="text-sm text-error-red mt-1">{errors.username}</p>
                )}
              </div>

              <div>
                <Label htmlFor="signup-email" className="text-neutral-text">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  className="mt-1 bg-input border-white/20 text-white placeholder:text-neutral-text/60"
                />
                {errors.email && (
                  <p className="text-sm text-error-red mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="signup-password" className="text-neutral-text">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) => updateFormData('password', e.target.value)}
                    className="bg-input border-white/20 text-white placeholder:text-neutral-text/60 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-text/60 hover:text-neutral-text"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${(passwordStrength(formData.password) / 5) * 100}%`,
                            backgroundColor: getPasswordStrengthColor(passwordStrength(formData.password))
                          }}
                        />
                      </div>
                      <span
                        className="text-xs"
                        style={{ color: getPasswordStrengthColor(passwordStrength(formData.password)) }}
                      >
                        {getPasswordStrengthText(passwordStrength(formData.password))}
                      </span>
                    </div>
                  </div>
                )}
                {errors.password && (
                  <p className="text-sm text-error-red mt-1">{errors.password}</p>
                )}
              </div>

              <div>
                <Label htmlFor="signup-confirm-password" className="text-neutral-text">Confirm Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                    className="bg-input border-white/20 text-white placeholder:text-neutral-text/60 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-text/60 hover:text-neutral-text"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {formData.confirmPassword && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                      {formData.password === formData.confirmPassword ? (
                        <CheckCircle size={16} className="text-success-green" />
                      ) : (
                        <AlertCircle size={16} className="text-error-red" />
                      )}
                    </div>
                  )}
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-error-red mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="text-sm text-neutral-text/70">
                By creating an account, you agree to our{' '}
                <button className="text-accent-teal hover:underline">Terms of Service</button>
              </div>

              <Button
                onClick={() => handleSubmit(true)}
                disabled={isLoading}
                className="w-full bg-accent-teal hover:bg-accent-teal/90 text-white"
                style={{ backgroundColor: 'var(--accent-teal)' }}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}