import { useState, useEffect, useCallback } from "react";
import { Instance, WarmingNumber, Message, WarmingConfig, ClientNumber } from "@/types/warming";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/StatsCard";
import { InstanceCard } from "@/components/InstanceCard";
import { AddInstanceDialog } from "@/components/AddInstanceDialog";
import { WarmingNumberCard } from "@/components/WarmingNumberCard";
import { MessagesList } from "@/components/MessagesList";
import { ConfigPanel } from "@/components/ConfigPanel";
import { ClientNumbersList } from "@/components/ClientNumbersList";
import { FlowVisualization } from "@/components/FlowVisualization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { 
  Server, 
  MessageSquare, 
  Flame, 
  Activity, 
  Plus,
  Phone,
  Loader2
} from "lucide-react";

export default function Index() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [warmingNumber, setWarmingNumber] = useState<WarmingNumber | null>(null);
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
  const [newWarmingPhone, setNewWarmingPhone] = useState("");

  // Fetch all data on mount
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [instancesRes, warmingRes, messagesRes, clientsRes, configRes] = await Promise.all([
        api.getInstances(),
        api.getWarmingNumber(),
        api.getMessages(),
        api.getClientNumbers(),
        api.getConfig(),
      ]);

      if (instancesRes.data) setInstances(instancesRes.data);
      if (warmingRes.data) setWarmingNumber(warmingRes.data);
      if (messagesRes.data) setMessages(messagesRes.data);
      if (clientsRes.data) setClientNumbers(clientsRes.data);
      if (configRes.data) setConfig(configRes.data);
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

  const handleToggleWarmingStatus = async (id: string) => {
    if (!warmingNumber || warmingNumber.id !== id) return;
    
    const { data, error } = await api.toggleWarmingStatus(id);
    
    if (error) {
      toast.error(error);
      return;
    }
    
    if (data) {
      setWarmingNumber(data);
      toast.success(data.status === 'warming' ? 'Aquecimento iniciado' : 'Aquecimento pausado');
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

  const handleSetWarmingNumber = async () => {
    if (!newWarmingPhone.trim()) return;
    
    const { data, error } = await api.setWarmingNumber(newWarmingPhone.trim());
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      setWarmingNumber(data);
      setNewWarmingPhone("");
      toast.success('Número de aquecimento definido');
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
            title="Mensagens Hoje"
            value={warmingNumber?.messagesReceived || 0}
            subtitle="Recebidas"
            icon={MessageSquare}
            trend={{ value: 25, isPositive: true }}
          />
          <StatsCard
            title="Enviadas Hoje"
            value={warmingNumber?.messagesSent || 0}
            subtitle="Pelo número aquecido"
            icon={Activity}
          />
          <StatsCard
            title="Status"
            value={warmingNumber?.status === 'warming' ? 'Aquecendo' : 'Pausado'}
            subtitle="Número principal"
            icon={Flame}
          />
        </div>

        {/* Flow Visualization */}
        <div className="mb-6 md:mb-8">
          <FlowVisualization instances={instances} warmingNumber={warmingNumber} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
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
                />
              ))}
              {instances.length === 0 && (
                <div className="glass-card p-6 md:p-8 text-center">
                  <Server className="w-10 h-10 md:w-12 md:h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm md:text-base text-muted-foreground">Nenhuma instância configurada</p>
                </div>
              )}
            </div>

            {/* Warming Number Setup */}
            <div className="glass-card p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <Phone className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                <h3 className="font-semibold text-foreground text-sm md:text-base">Número para Aquecer</h3>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newWarmingPhone}
                  onChange={(e) => setNewWarmingPhone(e.target.value)}
                  placeholder="5511999999999"
                  className="bg-secondary border-border/50 focus:border-primary text-sm"
                />
                <Button onClick={handleSetWarmingNumber} className="bg-primary hover:bg-primary/90 shrink-0 text-xs md:text-sm">
                  Definir
                </Button>
              </div>
            </div>
          </div>

          {/* Middle Column - Warming Status & Messages */}
          <div className="space-y-4 md:space-y-6">
            {warmingNumber && (
              <WarmingNumberCard
                number={warmingNumber}
                onToggleStatus={handleToggleWarmingStatus}
              />
            )}

            <MessagesList
              messages={messages}
              onAddMessage={handleAddMessage}
              onDeleteMessage={handleDeleteMessage}
              onImportMessages={handleImportMessages}
            />
          </div>

          {/* Right Column - Config & Clients */}
          <div className="space-y-4 md:space-y-6">
            <ConfigPanel config={config} onConfigChange={handleConfigChange} />
            <ClientNumbersList
              numbers={clientNumbers}
              onAddNumber={handleAddClientNumber}
              onDeleteNumber={handleDeleteClientNumber}
              onImportNumbers={handleImportClientNumbers}
            />
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
