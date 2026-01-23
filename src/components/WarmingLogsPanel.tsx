import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  Activity, 
  RefreshCw, 
  ArrowRight, 
  MessageSquare,
  User,
  Phone,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WarmingLog {
  id: string;
  action: string;
  details: {
    from?: string;
    to?: string;
    message?: string;
  };
  createdAt: string;
}

interface WarmingLogsPanelProps {
  isWarming: boolean;
}

const actionConfig: Record<string, { label: string; color: string; icon: typeof ArrowRight }> = {
  SECONDARY_TO_PRIMARY: {
    label: "Secundária → Principal",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: ArrowRight
  },
  PRIMARY_TO_SECONDARY: {
    label: "Principal → Secundária",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: ArrowRight
  },
  PRIMARY_TO_CLIENT: {
    label: "Principal → Cliente",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: User
  }
};

export function WarmingLogsPanel({ isWarming }: WarmingLogsPanelProps) {
  const [logs, setLogs] = useState<WarmingLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.getWarmingLogs(30);
      if (data) {
        setLogs(data);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh when warming is active
  useEffect(() => {
    if (!isWarming || !autoRefresh) return;

    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [isWarming, autoRefresh, fetchLogs]);

  return (
    <div className="glass-card p-4 md:p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground text-sm md:text-base">
            Logs de Atividade
          </h3>
          {isWarming && (
            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
              Ao Vivo
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isWarming && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "text-primary" : "text-muted-foreground"}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh && isWarming ? 'animate-spin' : ''}`} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[300px] md:h-[400px]">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">Nenhuma atividade registrada</p>
            <p className="text-xs mt-1">
              {isWarming ? "Aguardando próximo ciclo..." : "Inicie o aquecimento para ver os logs"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 pr-4">
            {logs.map((log) => {
              const config = actionConfig[log.action] || {
                label: log.action,
                color: "bg-secondary text-muted-foreground",
                icon: ArrowRight
              };
              const Icon = config.icon;

              return (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-secondary/50 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="outline" className={`${config.color} text-xs`}>
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                    <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-2">
                    <span className="font-medium text-foreground">{log.details.from}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-medium text-foreground">{log.details.to}</span>
                  </div>

                  {log.details.message && (
                    <div className="flex items-start gap-2 mt-2 p-2 rounded bg-background/50">
                      <MessageSquare className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {log.details.message}...
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {logs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            Mostrando {logs.length} atividades recentes
          </p>
        </div>
      )}
    </div>
  );
}
