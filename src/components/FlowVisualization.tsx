import { Instance, WarmingNumber } from "@/types/warming";
import { ArrowRight, Phone, Server, Flame } from "lucide-react";

interface FlowVisualizationProps {
  instances: Instance[];
  warmingNumber: WarmingNumber | null;
}

export function FlowVisualization({ instances, warmingNumber }: FlowVisualizationProps) {
  const activeInstances = instances.filter(i => i.status === 'connected' || i.status === 'warming');

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Flame className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Fluxo de Aquecimento</h3>
      </div>

      <div className="relative flex items-center justify-between gap-4 py-8">
        {/* Instâncias */}
        <div className="flex flex-col gap-3 shrink-0">
          {activeInstances.length > 0 ? (
            activeInstances.slice(0, 3).map((instance, index) => (
              <div
                key={instance.id}
                className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Server className="w-4 h-4 text-primary" />
                <span className="text-xs text-foreground font-medium">{instance.name}</span>
              </div>
            ))
          ) : (
            <div className="bg-secondary/30 rounded-lg px-3 py-2 border border-dashed border-border/50">
              <span className="text-xs text-muted-foreground">Nenhuma instância</span>
            </div>
          )}
        </div>

        {/* Setas animadas */}
        <div className="flex-1 flex flex-col gap-3 items-center justify-center min-w-[80px]">
          {activeInstances.slice(0, 3).map((_, index) => (
            <div key={index} className="w-full h-0.5 relative overflow-hidden">
              <div className="flow-line absolute inset-0" style={{ animationDelay: `${index * 0.5}s` }} />
            </div>
          ))}
        </div>

        {/* Número de aquecimento */}
        <div className="shrink-0">
          {warmingNumber ? (
            <div className="relative">
              <div className="bg-primary/20 rounded-xl p-4 border-2 border-primary/50 glow-effect">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Aquecendo</p>
                    <p className="text-sm font-bold text-foreground">{warmingNumber.phoneNumber}</p>
                  </div>
                </div>
              </div>
              {warmingNumber.status === 'warming' && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-warning rounded-full animate-pulse" />
              )}
            </div>
          ) : (
            <div className="bg-secondary/30 rounded-xl p-4 border border-dashed border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nenhum número</p>
                  <p className="text-sm text-muted-foreground">configurado</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Setas para clientes */}
        <div className="flex-1 flex items-center justify-center min-w-[80px]">
          <ArrowRight className="w-6 h-6 text-muted-foreground" />
        </div>

        {/* Clientes */}
        <div className="shrink-0">
          <div className="bg-secondary/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center"
                  >
                    <span className="text-xs text-primary">C</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Clientes</p>
                <p className="text-sm font-medium text-foreground">Aguardando</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          Instâncias enviam → Número aquece respondendo → Cliente recebe e responde
        </p>
      </div>
    </div>
  );
}
