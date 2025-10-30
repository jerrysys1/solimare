import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { useProfileDisplay } from '@/hooks/useProfileDisplay';

interface CompanionDisplayProps {
  walletAddress: string;
  className?: string;
}

export const CompanionDisplay = ({ walletAddress, className = "" }: CompanionDisplayProps) => {
  const { displayName, avatarUrl, loading } = useProfileDisplay(walletAddress);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback className="bg-muted text-muted-foreground">
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-mono">{displayName}</span>
    </div>
  );
};
