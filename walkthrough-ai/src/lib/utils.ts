import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  return `${seconds}s`;
}

export function formatCredits(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}
