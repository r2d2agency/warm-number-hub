import { WarmingNumber } from "@/types/warming";
import { Phone, ArrowUpRight, ArrowDownLeft, Pause, Play, Flame } from "lucide-react";
import { Button } from "./ui/button";

interface WarmingNumberCardProps {
  number: WarmingNumber;
  onToggleStatus: (id: string) => void;
}

export function WarmingNumberCard({ number, onToggleStatus }: WarmingNumberCardProps) {
  const statusConfig = {
    idle: {
      color: "text-muted-foreground",
      bg: "bg-muted/50",
      label: "Inativo",
    },
    warming: {
      color: "text-warning",
      bg: "bg-warning/10",
      label: "Aquecendo",
    },
    paused: {
      color: "text-muted-foreground",
      bg: "bg-muted/30",
      label: "Pausado",
    },
  };

  const config = statusConfig[number.status];

  return (
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Phone className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{number.phoneNumber}</h3>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
              {number.status === 'warming' && <Flame className="w-3 h-3" />}
              {config.label}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onToggleStatus(number.id)}
          className="border-border/50 hover:border-primary/50"
        >
          {number.status === 'warming' ? (
            <>
              <Pause className="w-4 h-4 mr-1" />
              Pausar
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-1" />
              Iniciar
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ArrowDownLeft className="w-4 h-4 text-success" />
            <span className="text-xs">Recebidas</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{number.messagesReceived}</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ArrowUpRight className="w-4 h-4 text-primary" />
            <span className="text-xs">Enviadas</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{number.messagesSent}</p>
        </div>
      </div>

      {number.lastActivity && (
        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
          Última atividade: {new Date(number.lastActivity).toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  );
}
