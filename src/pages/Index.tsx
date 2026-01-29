import { useState, useEffect, useCallback } from "react";
import { Instance, Message, WarmingConfig, ClientNumber } from "@/types/warming";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { InstanceCard } from "@/components/InstanceCard";
import { AddInstanceDialog } from "@/components/AddInstanceDialog";
import { MessagesList } from "@/components/MessagesList";
import { ConfigPanel } from "@/components/ConfigPanel";
import { ClientNumbersList } from "@/components/ClientNumbersList";
import { FlowVisualization } from "@/components/FlowVisualization";
import { WarmingLogsPanel } from "@/components/WarmingLogsPanel";
import { WarmingDiagnosticsPanel } from "@/components/WarmingDiagnosticsPanel";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
  Server, 
  MessageSquare, 
  Flame, 
  Activity, 
  Plus,
  Loader2,
  Star
} from "lucide-react";

export default function Index() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [clientNumbers, setClientNumbers] = useState<ClientNumber[]>([]);
  const [config, setConfig] = useState<WarmingConfig>({
    minDelaySeconds: 60,
    maxDelaySeconds: 180,
    messagesPerHour: 20,
    activeHoursStart: 8,
    activeHoursEnd: 22,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isAddInstanceOpen, setIsAddInstanceOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<Instance | null>(null);
  const [isWarming, setIsWarming] = useState(false);
  const [isTogglingWarming, setIsTogglingWarming] = useState(false);

  // Get the primary instance (warming number)
  const primaryInstance = instances.find(i => i.isPrimary);

  // Fetch all data on mount
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [instancesRes, messagesRes, clientsRes, configRes, warmingStatusRes] = await Promise.all([
        api.getInstances(),
        api.getMessages(),
        api.getClientNumbers(),
        api.getConfig(),
        api.getWarmingStatus(),
      ]);

      const errors = [
        { label: 'Instâncias', error: instancesRes.error },
        { label: 'Mensagens', error: messagesRes.error },
        { label: 'Clientes', error: clientsRes.error },
        { label: 'Config', error: configRes.error },
        { label: 'Status', error: warmingStatusRes.error },
      ].filter((e) => !!e.error);

      if (errors.length > 0) {
        toast.error(
          `Falha ao carregar: ${errors
            .map((e) => `${e.label}: ${e.error}`)
            .join(' | ')}`,
        );
      }

      if (instancesRes.data) setInstances(instancesRes.data);
      if (messagesRes.data) setMessages(messagesRes.data);
      if (clientsRes.data) setClientNumbers(clientsRes.data);
      if (configRes.data) setConfig(configRes.data);
      if (warmingStatusRes.data) setIsWarming(warmingStatusRes.data.isActive);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddInstance = async (data: Omit<Instance, 'id' | 'status'>) => {
    if (editingInstance) {
      // Update existing
      const { data: updated, error } = await api.updateInstance(editingInstance.id, data);
      if (error) {
        toast.error(error);
        return;
      }
      if (updated) {
        setInstances(instances.map(i => i.id === editingInstance.id ? updated : i));
        toast.success('Instância atualizada');
      }
    } else {
      // Create new
      const { data: created, error } = await api.createInstance(data);
      if (error) {
        toast.error(error);
        return;
      }
      if (created) {
        setInstances([...instances, created]);
        toast.success('Instância criada');
      }
    }
  };

  const handleEditInstance = (instance: Instance) => {
    setEditingInstance(instance);
    setIsAddInstanceOpen(true);
  };

  const handleDeleteInstance = async (id: string) => {
    const { error } = await api.deleteInstance(id);
    if (error) {
      toast.error(error);
      return;
    }
    setInstances(instances.filter(i => i.id !== id));
    toast.success('Instância removida');
  };

  const handleStatusUpdate = (id: string, status: Instance['status']) => {
    setInstances(instances.map(i => i.id === id ? { ...i, status } : i));
  };

  const handleSetPrimary = async (instance: Instance) => {
    const { data, error } = await api.setInstanceAsPrimary(instance.id);
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      // Update all instances - unset previous primary and set new one
      setInstances(instances.map(i => ({
        ...i,
        isPrimary: i.id === instance.id
      })));
      toast.success(`${instance.name} definida como instância principal`);
    }
  };

  const handleAddMessage = async (content: string) => {
    const { data, error } = await api.addMessage(content);
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      setMessages([...messages, data]);
      toast.success('Mensagem adicionada');
    }
  };

  const handleDeleteMessage = async (id: string) => {
    const { error } = await api.deleteMessage(id);
    if (error) {
      toast.error(error);
      return;
    }
    setMessages(messages.filter(m => m.id !== id));
  };

  const handleImportMessages = async (contents: string[]) => {
    const { data, error } = await api.importMessages(contents);
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      setMessages([...messages, ...data]);
      toast.success(`${data.length} mensagens importadas`);
    }
  };

  const handleAddClientNumber = async (phoneNumber: string, name?: string) => {
    const { data, error } = await api.addClientNumber(phoneNumber, name);
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      setClientNumbers([...clientNumbers, data]);
      toast.success('Número adicionado');
    }
  };

  const handleDeleteClientNumber = async (id: string) => {
    const { error } = await api.deleteClientNumber(id);
    if (error) {
      toast.error(error);
      return;
    }
    setClientNumbers(clientNumbers.filter(c => c.id !== id));
  };

  const handleImportClientNumbers = async (numbers: { phoneNumber: string; name?: string }[]) => {
    const { data, error } = await api.importClientNumbers(numbers);
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      setClientNumbers([...clientNumbers, ...data]);
      toast.success(`${data.length} números importados`);
    }
  };

  const handleConfigChange = async (newConfig: WarmingConfig) => {
    const { data, error } = await api.updateConfig(newConfig);
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      setConfig(data);
      toast.success('Configuração salva');
    }
  };

  const handleToggleWarming = async () => {
    setIsTogglingWarming(true);
    try {
      if (isWarming) {
        const { data, error } = await api.stopWarming();
        if (error) {
          toast.error(error);
          return;
        }
        if (data) {
          setIsWarming(false);
          toast.success('Aquecimento pausado');
        }
      } else {
        const { data, error } = await api.startWarming();
        if (error) {
          toast.error(error);
          return;
        }
        if (data) {
          setIsWarming(true);
          toast.success('Aquecimento iniciado');
        }
      }
    } catch (error) {
      toast.error('Erro ao alterar status do aquecimento');
    } finally {
      setIsTogglingWarming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <StatsCard
            title="Instâncias Ativas"
            value={instances.filter(i => i.status !== 'disconnected').length}
            subtitle={`${instances.length} total`}
            icon={Server}
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Mensagens Recebidas"
            value={primaryInstance?.messagesReceived || 0}
            subtitle="Instância principal"
            icon={MessageSquare}
            trend={{ value: 25, isPositive: true }}
          />
          <StatsCard
            title="Mensagens Enviadas"
            value={primaryInstance?.messagesSent || 0}
            subtitle="Pelo número principal"
            icon={Activity}
          />
          <StatsCard
            title="Status"
            value={primaryInstance ? (primaryInstance.status === 'connected' ? 'Conectado' : 'Desconectado') : 'Sem Principal'}
            subtitle={primaryInstance?.name || 'Configure uma instância'}
            icon={primaryInstance ? Flame : Star}
          />
        </div>

        {/* Alert if no primary instance */}
        {!primaryInstance && instances.length > 0 && (
          <div className="glass-card p-4 mb-6 border-warning/50 bg-warning/5">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-warning" />
              <div>
                <p className="font-medium text-foreground">Nenhuma instância principal definida</p>
                <p className="text-sm text-muted-foreground">
                  Clique no menu de uma instância e selecione "Definir como Principal" para escolher o número de aquecimento.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Flow Visualization */}
        <div className="mb-6 md:mb-8">
          <FlowVisualization instances={instances} warmingNumber={primaryInstance ? {
            id: primaryInstance.id,
            phoneNumber: primaryInstance.phoneNumber || primaryInstance.name,
            status: primaryInstance.status === 'connected' ? 'warming' : 'idle',
            messagesSent: primaryInstance.messagesSent || 0,
            messagesReceived: primaryInstance.messagesReceived || 0,
          } : null} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Left Column - Instances */}
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base md:text-lg font-semibold text-foreground">Instâncias Evolution</h2>
              <Button 
                onClick={() => setIsAddInstanceOpen(true)}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-xs md:text-sm"
              >
                <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                Nova
              </Button>
            </div>

            <div className="space-y-3">
              {instances.map((instance) => (
                <InstanceCard
                  key={instance.id}
                  instance={instance}
                  onEdit={handleEditInstance}
                  onDelete={handleDeleteInstance}
                  onStatusUpdate={handleStatusUpdate}
                  onSetPrimary={handleSetPrimary}
                />
              ))}
              {instances.length === 0 && (
                <div className="glass-card p-6 md:p-8 text-center">
                  <Server className="w-10 h-10 md:w-12 md:h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm md:text-base text-muted-foreground">Nenhuma instância configurada</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adicione instâncias e defina uma como principal para aquecimento
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Second Column - Messages */}
          <div className="space-y-4 md:space-y-6">
            <MessagesList
              messages={messages}
              onAddMessage={handleAddMessage}
              onDeleteMessage={handleDeleteMessage}
              onImportMessages={handleImportMessages}
            />
          </div>

          {/* Third Column - Config & Clients */}
          <div className="space-y-4 md:space-y-6">
            <ConfigPanel 
              config={config} 
              onConfigChange={handleConfigChange} 
              isWarming={isWarming}
              onToggleWarming={handleToggleWarming}
              isTogglingWarming={isTogglingWarming}
            />
            <ClientNumbersList
              numbers={clientNumbers}
              onAddNumber={handleAddClientNumber}
              onDeleteNumber={handleDeleteClientNumber}
              onImportNumbers={handleImportClientNumbers}
            />
          </div>

          {/* Fourth Column - Diagnostics & Logs */}
          <div className="space-y-4 md:space-y-6">
            <WarmingDiagnosticsPanel />
            <WarmingLogsPanel isWarming={isWarming} />
          </div>
        </div>
      </main>

      <AddInstanceDialog
        open={isAddInstanceOpen}
        onOpenChange={(open) => {
          setIsAddInstanceOpen(open);
          if (!open) setEditingInstance(null);
        }}
        onAdd={handleAddInstance}
        editingInstance={editingInstance}
      />
    </div>
  );
}