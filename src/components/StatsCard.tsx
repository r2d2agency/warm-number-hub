import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({ title, value, subtitle, icon: Icon, trend }: StatsCardProps) {
  return (
    <div className="glass-card p-3 md:p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
          <p className="text-xs md:text-sm text-muted-foreground font-medium truncate">{title}</p>
          <p className="text-xl md:text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-[10px] md:text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 text-[10px] md:text-xs ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
              <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground hidden sm:inline">vs ontem</span>
            </div>
          )}
        </div>
        <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 md:w-6 md:h-6 text-primary" />
        </div>
      </div>
    </div>
  );
}
