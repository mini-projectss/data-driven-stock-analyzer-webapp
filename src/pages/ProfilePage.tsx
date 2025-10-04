import React from 'react';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { UserSummaryCard } from '../components/profile/UserSummaryCard';
import { EnhancedWatchlist } from '../components/profile/EnhancedWatchlist';
import { AccountSettings } from '../components/profile/AccountSettings';
import { User } from 'lucide-react';

interface ProfilePageProps {
  onNavigate?: (page: string) => void;
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const handleLogout = () => {
    // In a real app, this would clear auth tokens and redirect to login
    onNavigate?.('landing');
  };

  return (
    <div className="min-h-screen brand-gradient flex">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <DashboardSidebar 
          activeSection="profile"
          onSectionChange={() => {}}
          onNavigate={onNavigate}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="glass-card border-b border-white/10 p-6">
          <div className="flex items-center space-x-3">
            <User className="w-6 h-6 text-accent-teal" />
            <h1 className="text-2xl text-white font-semibold">
              Profile & Settings
            </h1>
          </div>
        </div>

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* User Summary Card */}
            <UserSummaryCard onLogout={handleLogout} />
            
            {/* Enhanced Watchlist */}
            <EnhancedWatchlist />
            
            {/* Account Settings */}
            <AccountSettings onLogout={handleLogout} />
          </div>
        </main>
      </div>
    </div>
  );
}