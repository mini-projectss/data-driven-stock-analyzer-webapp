import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { ArrowUpDown } from 'lucide-react';

interface TrendsTableProps {
  ticker: string;
  data: Array<{
    date: string;
    interest: number;
  }>;
}

export function TrendsTable({ ticker, data }: TrendsTableProps) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortBy, setSortBy] = useState<'date' | 'interest'>('date');

  const handleSort = (column: 'date' | 'interest') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let aVal: any, bVal: any;
    
    if (sortBy === 'date') {
      aVal = new Date(a.date);
      bVal = new Date(b.date);
    } else {
      aVal = a.interest;
      bVal = b.interest;
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const getInterestColor = (interest: number) => {
    if (interest >= 80) return 'var(--success-green)';
    if (interest >= 60) return '#FF9800';
    if (interest >= 40) return 'var(--accent-teal)';
    return 'var(--error-red)';
  };

  const getInterestLabel = (interest: number) => {
    if (interest >= 80) return 'Very High';
    if (interest >= 60) return 'High';
    if (interest >= 40) return 'Medium';
    if (interest >= 20) return 'Low';
    return 'Very Low';
  };

  return (
    <Card className="glass-card p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg text-white font-semibold">
            Interest Table
          </h3>
          {data.length > 0 && (
            <Badge variant="outline" className="border-accent-teal/30 text-accent-teal">
              {data.length} data points
            </Badge>
          )}
        </div>

        {data.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 opacity-20">
              <svg viewBox="0 0 100 100" className="w-full h-full text-neutral-text">
                <rect x="10" y="70" width="15" height="20" fill="currentColor" opacity="0.3" />
                <rect x="30" y="50" width="15" height="40" fill="currentColor" opacity="0.5" />
                <rect x="50" y="30" width="15" height="60" fill="currentColor" opacity="0.7" />
                <rect x="70" y="60" width="15" height="30" fill="currentColor" opacity="0.4" />
              </svg>
            </div>
            <p className="text-neutral-text/80 mb-2">
              No trend data available
            </p>
            <p className="text-neutral-text/60 text-sm">
              Search for a ticker to populate the interest table
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-neutral-text w-16">Sr No.</TableHead>
                  <TableHead className="text-neutral-text">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('date')}
                      className="text-neutral-text hover:text-white hover:bg-white/10 p-0 h-auto font-normal"
                    >
                      Date
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-neutral-text text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('interest')}
                      className="text-neutral-text hover:text-white hover:bg-white/10 p-0 h-auto font-normal"
                    >
                      Interest Index
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-neutral-text">Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((row, index) => (
                  <TableRow 
                    key={index} 
                    className={`border-white/10 hover:bg-white/5 ${
                      index % 2 === 0 ? 'bg-white/5' : 'bg-transparent'
                    }`}
                  >
                    <TableCell className="text-neutral-text/80 font-mono">
                      {String(index + 1).padStart(2, '0')}
                    </TableCell>
                    <TableCell className="text-white font-medium">
                      {new Date(row.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <span 
                        className="font-semibold"
                        style={{ color: getInterestColor(row.interest) }}
                      >
                        {row.interest}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className="text-xs"
                        style={{ 
                          borderColor: getInterestColor(row.interest), 
                          color: getInterestColor(row.interest) 
                        }}
                      >
                        {getInterestLabel(row.interest)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Card>
  );
}