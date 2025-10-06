import React, { useState } from 'react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { 
  BarChart3, 
  Brain, 
  Newspaper, 
  TrendingUp, 
  User, 
  Search,
  LogOut,
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import exampleImage from 'figma:asset/0dd8719a28e6e6e3bc4e70218a8dff6075f23811.png';

interface DashboardSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onNavigate?: (page: string) => void;
}

export function DashboardSidebar({ activeSection, onSectionChange, onNavigate }: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, isPage: true },
    { id: 'prediction', label: 'Prediction Engine', icon: Brain, isPage: true },
    { id: 'news', label: 'News Feed', icon: Newspaper, isPage: true },
    { id: 'trends', label: 'Google Trends', icon: Search, isPage: true },
    { id: 'political', label: 'Political Trading', icon: TrendingUp, isPage: true },
    { id: 'profile', label: 'Profile', icon: User, isPage: true },
    { id: 'logout', label: 'Logout', icon: LogOut, isPage: false },
  ];

  return (
    <div className={`glass-card h-full transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          {!collapsed ? (
            <div className="flex items-center space-x-3">
              <img 
                src={exampleImage}
                alt="Logo"
                className="w-8 h-8 rounded-lg"
              />
              <h2 className="text-white font-semibold">Navigation</h2>
            </div>
          ) : (
            <img 
              src={exampleImage}
              alt="Logo"
              className="w-8 h-8 rounded-lg mx-auto"
            />
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="text-neutral-text hover:text-white hover:bg-white/10"
            >
              <ChevronLeft size={16} />
            </Button>
          )}
        </div>
        {collapsed && (
          <div className="mt-2 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="text-neutral-text hover:text-white hover:bg-white/10 p-1"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={activeSection === item.id ? "default" : "ghost"}
              className={`w-full justify-start ${
                collapsed ? 'px-3' : 'px-4'
              } ${
                activeSection === item.id
                  ? 'bg-accent-teal text-white'
                  : 'text-neutral-text hover:text-white hover:bg-white/10'
              }`}
              onClick={() => {
                if (item.id === 'logout') {
                  onNavigate?.('landing');
                } else if (item.isPage) {
                  onNavigate?.(item.id);
                } else {
                  onSectionChange(item.id);
                }
              }}
              style={activeSection === item.id ? { backgroundColor: 'var(--accent-teal)' } : {}}
            >
              <item.icon className={`${collapsed ? 'w-4 h-4' : 'w-4 h-4 mr-3'}`} />
              {!collapsed && item.label}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}