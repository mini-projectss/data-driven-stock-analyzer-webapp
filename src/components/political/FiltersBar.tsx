import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface FiltersBarProps {
  onExchangeChange: (exchange: 'NSE' | 'BSE') => void;
  onDateRangeChange: (startDate: Date | null, endDate: Date | null) => void;
  onCategoryChange: (category: 'All' | 'Politician' | 'Promoter') => void;
  onSearchChange: (search: string) => void;
  exchange: 'NSE' | 'BSE';
  startDate: Date | null;
  endDate: Date | null;
  category: 'All' | 'Politician' | 'Promoter';
  searchQuery: string;
}

export function FiltersBar({
  onExchangeChange,
  onDateRangeChange,
  onCategoryChange,
  onSearchChange,
  exchange,
  startDate,
  endDate,
  category,
  searchQuery
}: FiltersBarProps) {
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);

  return (
    <Card className="glass-card p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
        {/* Exchange Selector */}
        <div className="space-y-2">
          <label className="text-sm text-neutral-text">Exchange</label>
          <div className="flex space-x-1">
            <Button
              onClick={() => onExchangeChange('NSE')}
              size="sm"
              variant={exchange === 'NSE' ? 'default' : 'outline'}
              className={`flex-1 ${
                exchange === 'NSE'
                  ? 'bg-accent-teal text-white hover:bg-accent-teal/90'
                  : 'border-white/20 text-neutral-text hover:border-accent-teal hover:text-accent-teal'
              }`}
              style={exchange === 'NSE' ? { backgroundColor: 'var(--accent-teal)' } : {}}
            >
              NSE
            </Button>
            <Button
              onClick={() => onExchangeChange('BSE')}
              size="sm"
              variant={exchange === 'BSE' ? 'default' : 'outline'}
              className={`flex-1 ${
                exchange === 'BSE'
                  ? 'bg-accent-teal text-white hover:bg-accent-teal/90'
                  : 'border-white/20 text-neutral-text hover:border-accent-teal hover:text-accent-teal'
              }`}
              style={exchange === 'BSE' ? { backgroundColor: 'var(--accent-teal)' } : {}}
            >
              BSE
            </Button>
          </div>
        </div>

        {/* Start Date Picker */}
        <div className="space-y-2">
          <label className="text-sm text-neutral-text">Start Date</label>
          <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left bg-input border-white/20 text-white hover:border-accent-teal hover:text-accent-teal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'MMM dd, yyyy') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 glass-card border border-white/20" align="start">
              <Calendar
                mode="single"
                selected={startDate || undefined}
                onSelect={(date) => {
                  onDateRangeChange(date || null, endDate);
                  setIsStartDateOpen(false);
                }}
                disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                initialFocus
                className="text-white"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date Picker */}
        <div className="space-y-2">
          <label className="text-sm text-neutral-text">End Date</label>
          <Popover open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left bg-input border-white/20 text-white hover:border-accent-teal hover:text-accent-teal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'MMM dd, yyyy') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 glass-card border border-white/20" align="start">
              <Calendar
                mode="single"
                selected={endDate || undefined}
                onSelect={(date) => {
                  onDateRangeChange(startDate, date || null);
                  setIsEndDateOpen(false);
                }}
                disabled={(date) => date > new Date() || (startDate && date < startDate)}
                initialFocus
                className="text-white"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Category Dropdown */}
        <div className="space-y-2">
          <label className="text-sm text-neutral-text">Category</label>
          <Select value={category} onValueChange={(value: 'All' | 'Politician' | 'Promoter') => onCategoryChange(value)}>
            <SelectTrigger className="bg-input border-white/20 text-white hover:border-accent-teal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-card border border-white/20">
              <SelectItem value="All" className="text-white hover:bg-white/10">All</SelectItem>
              <SelectItem value="Politician" className="text-white hover:bg-white/10">Politician</SelectItem>
              <SelectItem value="Promoter" className="text-white hover:bg-white/10">Promoter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Bar */}
        <div className="space-y-2 lg:col-span-2">
          <label className="text-sm text-neutral-text">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-text/60" />
            <Input
              placeholder="Search person or stock name..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-input border-white/20 text-white placeholder:text-neutral-text/60"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}