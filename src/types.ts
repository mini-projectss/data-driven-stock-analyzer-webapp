// src/types.ts

export interface PillData {
  'Clock'?: string;
  'Market status'?: string;
  'Adv/Decline'?: string;
  'USD/INR'?: number;
  'India VIX'?: number;
}

export interface IndexData {
  name: string;
  value: number;
  change: number;
  pctChange: number;
  sparkline: number[];
}

export interface CandlestickData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TableRow {
  instrument: string;
  volume: number;
  high: number;
  low: number;
}

export interface TreemapNode {
    name: string;
    value: number; // Represents volume
    change: number; // Represents % change
}