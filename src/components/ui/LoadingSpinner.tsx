import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

export const LoadingSpinner = ({ size = 6, color = 'text-amber-600' }: LoadingSpinnerProps) => (
  <div className="relative">
    <Loader2 className={`w-${size} h-${size} ${color} animate-spin`} />
  </div>
);

