import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Mail, Lock, LogOut, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface AccountSettingsProps {
  onLogout?: () => void;
}

export function AccountSettings({ onLogout }: AccountSettingsProps) {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    password: ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleEmailChange = async () => {
    if (!emailForm.newEmail || !emailForm.password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Email change request sent. Check your inbox for verification.');
      setIsEmailModalOpen(false);
      setEmailForm({ newEmail: '', password: '' });
    } catch (error) {
      toast.error('Failed to change email. Please try again.');
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Password updated successfully');
      setIsPasswordModalOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error('Failed to change password. Please try again.');
    }
  };

  const settingsCards = [
    {
      id: 'email',
      title: 'Change Email',
      description: 'Update your email address',
      icon: Mail,
      action: () => setIsEmailModalOpen(true),
      color: 'var(--accent-teal)'
    },
    {
      id: 'password',
      title: 'Change Password',
      description: 'Update your account password',
      icon: Lock,
      action: () => setIsPasswordModalOpen(true),
      color: '#FF9800'
    },
    {
      id: 'logout',
      title: 'Logout',
      description: 'Sign out of your account',
      icon: LogOut,
      action: onLogout,
      color: 'var(--error-red)'
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="glass-card p-6">
        <h2 className="text-xl text-white font-semibold mb-6">
          Account Settings
        </h2>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsCards.map((card) => {
            const IconComponent = card.icon;
            
            return (
              <Card 
                key={card.id}
                className="glass-card p-6 hover:bg-white/5 transition-colors cursor-pointer group"
                onClick={card.action}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${card.color}20` }}
                  >
                    <IconComponent 
                      className="w-6 h-6"
                      style={{ color: card.color }}
                    />
                  </div>
                  
                  <div>
                    <h3 className="text-white font-semibold mb-1 group-hover:text-accent-teal transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-neutral-text/80 text-sm">
                      {card.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>

      {/* Change Email Modal */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="glass-card border border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Change Email Address</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="new-email" className="text-neutral-text">
                New Email Address
              </Label>
              <Input
                id="new-email"
                type="email"
                placeholder="Enter new email"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm({...emailForm, newEmail: e.target.value})}
                className="mt-1 bg-input border-white/20 text-white placeholder:text-neutral-text/60"
              />
            </div>
            
            <div>
              <Label htmlFor="email-password" className="text-neutral-text">
                Current Password
              </Label>
              <Input
                id="email-password"
                type="password"
                placeholder="Enter current password"
                value={emailForm.password}
                onChange={(e) => setEmailForm({...emailForm, password: e.target.value})}
                className="mt-1 bg-input border-white/20 text-white placeholder:text-neutral-text/60"
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button
                onClick={handleEmailChange}
                className="flex-1 bg-accent-teal hover:bg-accent-teal/90 text-white"
                style={{ backgroundColor: 'var(--accent-teal)' }}
              >
                Change Email
              </Button>
              <Button
                onClick={() => setIsEmailModalOpen(false)}
                variant="outline"
                className="flex-1 border-white/20 text-neutral-text hover:border-error-red hover:text-error-red"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="glass-card border border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Change Password</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="current-password" className="text-neutral-text">
                Current Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  className="bg-input border-white/20 text-white placeholder:text-neutral-text/60 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-text/60 hover:text-white"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="new-password" className="text-neutral-text">
                New Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  className="bg-input border-white/20 text-white placeholder:text-neutral-text/60 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-text/60 hover:text-white"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="confirm-password" className="text-neutral-text">
                Confirm New Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  className="bg-input border-white/20 text-white placeholder:text-neutral-text/60 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-text/60 hover:text-white"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button
                onClick={handlePasswordChange}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                Change Password
              </Button>
              <Button
                onClick={() => setIsPasswordModalOpen(false)}
                variant="outline"
                className="flex-1 border-white/20 text-neutral-text hover:border-error-red hover:text-error-red"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}