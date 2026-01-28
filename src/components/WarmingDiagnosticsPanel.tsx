import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { 
  Activity, 
  RefreshCw, 
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Server,
  MessageSquare,
  Users,
  Clock,
  Zap,
  TrendingUp
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WarmingDiagnostics {
  status: {
    isActive: boolean;
    startedAt: string | null;
    nextCycleAt: string | null;
  };
  config: {
    minDelaySeconds: number;
    maxDelaySeconds: number;
    messagesPerHour: number;
    activeHoursStart: number;
    activeHoursEnd: number;
  } | null;
  requirements: {
    hasPrimaryInstance: boolean;
    primaryInstanceConnected: boolean;
    primaryHasPhoneNumber: boolean;
    hasSecondaryInstances: boolean;
    secondaryConnectedCount: number;
    hasMessages: boolean;
    messagesCount: number;
    hasClientNumbers: boolean;
    clientNumbersCount: number;
  };
  primaryInstance: {
    id: string;
    name: string;
    phoneNumber: string;
    status: string;
    apiUrl: string;
    messagesSent: number;
    messagesReceived: number;
  } | null;
  stats: {
    last24h: {
      total: number;
      byAction: Record<string, number>;
    };
    hourly: Array<{
      hour: string;
      count: number;
      secondaryToPrimary: number;
      primaryToSecondary: number;
      primaryToClient: number;
      errors: number;
    }>;
  };
  recentErrors: Array<{
    id: string;
    details: Record<string, unknown>;
    createdAt: string;
  }>;
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

export function WarmingDiagnosticsPanel() {
  const [diagnostics, setDiagnostics] = useState<WarmingDiagnostics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testingInstance, setTestingInstance] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchDiagnostics = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.getWarmingDiagnostics();
      if (data) {
        setDiagnostics(data);
      }
    } catch (error) {
      console.error('Error fetching diagnostics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiagnostics();
  }, [fetchDiagnostics]);

  // Auto-refresh when warming is active
  useEffect(() => {
    if (!diagnostics?.status.isActive) return;
    
    const interval = setInterval(fetchDiagnostics, 10000);
    return () => clearInterval(interval);
  }, [diagnostics?.status.isActive, fetchDiagnostics]);

  const handleTestConnection = async () => {
    if (!diagnostics?.primaryInstance?.id) return;
    
    setTestingInstance(true);
    setTestResult(null);
    
    try {
      const { data, error } = await api.testInstanceConnection(diagnostics.primaryInstance.id);
      if (error) {
        setTestResult({ success: false, message: error });
      } else if (data) {
        setTestResult({ 
          success: data.success, 
          message: data.success 
            ? `Conectado! Estado: ${data.state}, Latência: ${data.latency}ms` 
            : `Falha: ${data.error}`
        });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Erro ao testar conexão' });
    } finally {
      setTestingInstance(false);
    }
  };

  if (isLoading && !diagnostics) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!diagnostics) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Erro ao carregar diagnósticos
      </div>
    );
  }

  const requirements = diagnostics.requirements;
  const allRequirementsMet = 
    requirements.hasPrimaryInstance && 
    requirements.primaryInstanceConnected && 
    requirements.primaryHasPhoneNumber &&
    requirements.hasMessages;

  // Prepare pie chart data
  const pieData = Object.entries(diagnostics.stats.last24h.byAction)
    .filter(([key]) => !['ERROR', 'SKIPPED', 'STARTED', 'STOPPED'].includes(key))
    .map(([name, value]) => ({
      name: name === 'SECONDARY_TO_PRIMARY' ? 'Sec→Pri' 
          : name === 'PRIMARY_TO_SECONDARY' ? 'Pri→Sec'
          : name === 'PRIMARY_TO_CLIENT' ? 'Pri→Cliente'
          : name,
      value
    }));

  // Prepare hourly chart data
  const hourlyData = diagnostics.stats.hourly.slice(-12).map(h => ({
    hour: new Date(h.hour).getHours() + 'h',
    Enviadas: h.secondaryToPrimary + h.primaryToSecondary + h.primaryToClient,
    Erros: h.errors
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Diagnósticos</h3>
          {diagnostics.status.isActive && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
              Ativo
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchDiagnostics}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Requirements Check */}
      <Card className="glass-card">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Requisitos para Aquecimento
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 space-y-2">
          <RequirementItem 
            met={requirements.hasPrimaryInstance} 
            label="Instância principal configurada" 
          />
          <RequirementItem 
            met={requirements.primaryInstanceConnected} 
            label="Instância principal conectada" 
          />
          <RequirementItem 
            met={requirements.primaryHasPhoneNumber} 
            label="Número de telefone na instância principal" 
          />
          <RequirementItem 
            met={requirements.hasSecondaryInstances} 
            label={`Instâncias secundárias (${requirements.secondaryConnectedCount} conectadas)`} 
            warning={!requirements.hasSecondaryInstances}
          />
          <RequirementItem 
            met={requirements.hasMessages} 
            label={`Mensagens configuradas (${requirements.messagesCount})`} 
          />
          <RequirementItem 
            met={requirements.hasClientNumbers} 
            label={`Números de clientes (${requirements.clientNumbersCount})`} 
            warning={!requirements.hasClientNumbers}
          />
          
          {!allRequirementsMet && (
            <div className="mt-3 p-2 rounded bg-destructive/10 border border-destructive/30">
              <p className="text-xs text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Requisitos obrigatórios não atendidos. O aquecimento não funcionará corretamente.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Primary Instance Status */}
      {diagnostics.primaryInstance && (
        <Card className="glass-card">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              Instância Principal
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Nome:</span>
                <p className="font-medium">{diagnostics.primaryInstance.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium">{diagnostics.primaryInstance.status}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Telefone:</span>
                <p className="font-medium">{diagnostics.primaryInstance.phoneNumber || 'Não configurado'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">API:</span>
                <p className="font-medium truncate" title={diagnostics.primaryInstance.apiUrl}>
                  {new URL(diagnostics.primaryInstance.apiUrl).hostname}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-secondary/50 text-center">
                <p className="text-lg font-bold text-foreground">{diagnostics.primaryInstance.messagesSent}</p>
                <p className="text-[10px] text-muted-foreground">Enviadas</p>
              </div>
              <div className="p-2 rounded bg-secondary/50 text-center">
                <p className="text-lg font-bold text-foreground">{diagnostics.primaryInstance.messagesReceived}</p>
                <p className="text-[10px] text-muted-foreground">Recebidas</p>
              </div>
            </div>

            <Button 
              size="sm" 
              variant="outline" 
              className="w-full"
              onClick={handleTestConnection}
              disabled={testingInstance}
            >
              {testingInstance ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Testar Conexão API
            </Button>
            
            {testResult && (
              <div className={`p-2 rounded text-xs ${testResult.success ? 'bg-green-500/10 text-green-400' : 'bg-destructive/10 text-destructive'}`}>
                {testResult.message}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="glass-card">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{diagnostics.stats.last24h.total}</p>
            <p className="text-[10px] text-muted-foreground">Mensagens (24h)</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-warning" />
            <p className="text-2xl font-bold">{diagnostics.stats.last24h.byAction['ERROR'] || 0}</p>
            <p className="text-[10px] text-muted-foreground">Erros (24h)</p>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Chart */}
      {hourlyData.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Atividade por Hora
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                  <Bar dataKey="Enviadas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Erros" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribution Pie Chart */}
      {pieData.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Distribuição de Ações
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Errors */}
      {diagnostics.recentErrors.length > 0 && (
        <Card className="glass-card border-destructive/30">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <XCircle className="w-4 h-4" />
              Erros Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <ScrollArea className="h-[150px]">
              <div className="space-y-2">
                {diagnostics.recentErrors.map((error) => (
                  <div key={error.id} className="p-2 rounded bg-destructive/10 text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-destructive">
                        {(error.details as { action?: string }).action || 'Erro'}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(error.createdAt), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {(error.details as { error?: string; reason?: string }).error || 
                       (error.details as { error?: string; reason?: string }).reason || 
                       'Erro desconhecido'}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Config Summary */}
      {diagnostics.config && (
        <Card className="glass-card">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Configuração Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Delay:</span>
                <p className="font-medium">{diagnostics.config.minDelaySeconds}s - {diagnostics.config.maxDelaySeconds}s</p>
              </div>
              <div>
                <span className="text-muted-foreground">Mensagens/hora:</span>
                <p className="font-medium">{diagnostics.config.messagesPerHour}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Horário ativo:</span>
                <p className="font-medium">{diagnostics.config.activeHoursStart}h às {diagnostics.config.activeHoursEnd}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RequirementItem({ met, label, warning = false }: { met: boolean; label: string; warning?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : warning ? (
        <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
      )}
      <span className={met ? 'text-foreground' : warning ? 'text-warning' : 'text-destructive'}>
        {label}
      </span>
    </div>
  );
}
