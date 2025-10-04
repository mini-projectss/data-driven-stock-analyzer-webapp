import React, { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Clock, Activity, TrendingUp, DollarSign } from 'lucide-react';

interface DashboardHeaderProps {
  onSearch?: (query: string) => void;
}

export function DashboardHeader({ onSearch }: DashboardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <div className="glass-card border-b border-white/10 p-4 space-y-4">
      {/* Search and Exchange Selector */}
      <div className="flex items-center space-x-4">
        <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-text/60" />
          <Input
            placeholder="Search stocks (e.g., RELIANCE, TCS)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input border-white/20 text-white placeholder:text-neutral-text/60"
          />
        </form>

        <Select defaultValue="nse">
          <SelectTrigger className="w-32 bg-input border-white/20 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-white/20">
            <SelectItem value="nse">NSE</SelectItem>
            <SelectItem value="bse">BSE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Pills */}
      <div className="flex items-center space-x-4 overflow-x-auto">
        <Badge variant="outline" className="border-white/20 text-neutral-text whitespace-nowrap">
          <Clock className="w-3 h-3 mr-1" />
          IST 15:30
        </Badge>
        
        <Badge 
          variant="outline" 
          className="border-success-green/30 text-success-green whitespace-nowrap"
          style={{ borderColor: 'var(--success-green)', color: 'var(--success-green)' }}
        >
          <Activity className="w-3 h-3 mr-1" />
          Market Open
        </Badge>
        
        <Badge variant="outline" className="border-white/20 text-neutral-text whitespace-nowrap">
          <TrendingUp className="w-3 h-3 mr-1" />
          Adv/Dec: 1.2
        </Badge>
        
        <Badge variant="outline" className="border-white/20 text-neutral-text whitespace-nowrap">
          <DollarSign className="w-3 h-3 mr-1" />
          USD/INR: 83.45
        </Badge>
        
        <Badge variant="outline" className="border-white/20 text-neutral-text whitespace-nowrap">
          India VIX: 14.2
        </Badge>
      </div>
    </div>
  );
}