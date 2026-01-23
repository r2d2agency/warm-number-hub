import { WarmingConfig } from "@/types/warming";
import { Settings, Clock, Zap, Play, Pause } from "lucide-react";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface ConfigPanelProps {
  config: WarmingConfig;
  onConfigChange: (config: WarmingConfig) => void;
  isWarming?: boolean;
  onToggleWarming?: () => void;
}

export function ConfigPanel({ config, onConfigChange, isWarming = false, onToggleWarming }: ConfigPanelProps) {
  const handleHourChange = (field: 'activeHoursStart' | 'activeHoursEnd', value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 23) {
      onConfigChange({ ...config, [field]: numValue });
    }
  };

  return (
    <div className="glass-card p-4 md:p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground text-sm md:text-base">Configurações de Aquecimento</h3>
        </div>
        {onToggleWarming && (
          <Button
            onClick={onToggleWarming}
            variant={isWarming ? "destructive" : "default"}
            size="sm"
            className="gap-2"
          >
            {isWarming ? (
              <>
                <Pause className="w-4 h-4" />
                <span className="hidden sm:inline">Parar</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span className="hidden sm:inline">Iniciar</span>
              </>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-4 md:space-y-6">
        <div className="space-y-2 md:space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Delay Mínimo (segundos)</span>
              <span className="sm:hidden">Delay Mín.</span>
            </Label>
            <span className="text-xs md:text-sm font-medium text-foreground">{config.minDelaySeconds}s</span>
          </div>
          <Slider
            value={[config.minDelaySeconds]}
            onValueChange={([value]) => onConfigChange({ ...config, minDelaySeconds: value })}
            min={10}
            max={300}
            step={10}
            className="[&_[role=slider]]:bg-primary"
          />
        </div>

        <div className="space-y-2 md:space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Delay Máximo (segundos)</span>
              <span className="sm:hidden">Delay Máx.</span>
            </Label>
            <span className="text-xs md:text-sm font-medium text-foreground">{config.maxDelaySeconds}s</span>
          </div>
          <Slider
            value={[config.maxDelaySeconds]}
            onValueChange={([value]) => onConfigChange({ ...config, maxDelaySeconds: value })}
            min={60}
            max={600}
            step={30}
            className="[&_[role=slider]]:bg-primary"
          />
        </div>

        <div className="space-y-2 md:space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
              <Zap className="w-3 h-3 md:w-4 md:h-4" />
              Mensagens por Hora
            </Label>
            <span className="text-xs md:text-sm font-medium text-foreground">{config.messagesPerHour}</span>
          </div>
          <Slider
            value={[config.messagesPerHour]}
            onValueChange={([value]) => onConfigChange({ ...config, messagesPerHour: value })}
            min={5}
            max={60}
            step={5}
            className="[&_[role=slider]]:bg-primary"
          />
        </div>

        <div className="pt-3 md:pt-4 border-t border-border/50">
          <Label className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3 block">Horário de Funcionamento</Label>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="bg-secondary/50 rounded-lg p-2 md:p-3">
              <p className="text-[10px] md:text-xs text-muted-foreground mb-1">Início</p>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={config.activeHoursStart}
                  onChange={(e) => handleHourChange('activeHoursStart', e.target.value)}
                  className="w-14 h-8 text-center text-base md:text-lg font-bold p-1"
                />
                <span className="text-muted-foreground">:00</span>
              </div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2 md:p-3">
              <p className="text-[10px] md:text-xs text-muted-foreground mb-1">Fim</p>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={config.activeHoursEnd}
                  onChange={(e) => handleHourChange('activeHoursEnd', e.target.value)}
                  className="w-14 h-8 text-center text-base md:text-lg font-bold p-1"
                />
                <span className="text-muted-foreground">:00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
