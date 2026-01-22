import { useState } from "react";
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
import { 
  Server, 
  MessageSquare, 
  Flame, 
  Activity, 
  Plus,
  Phone
} from "lucide-react";

export default function Index() {
  const [instances, setInstances] = useState<Instance[]>([
    {
      id: "1",
      name: "Instância A",
      apiUrl: "https://api.evolution.com/instance-a",
      apiKey: "key-a",
      status: "connected",
      phoneNumber: "5511999999991",
    },
    {
      id: "2",
      name: "Instância B",
      apiUrl: "https://api.evolution.com/instance-b",
      apiKey: "key-b",
      status: "warming",
      phoneNumber: "5511999999992",
    },
  ]);

  const [warmingNumber, setWarmingNumber] = useState<WarmingNumber>({
    id: "1",
    phoneNumber: "5511988888888",
    status: "warming",
    messagesSent: 45,
    messagesReceived: 128,
    lastActivity: new Date(),
  });

  const [messages, setMessages] = useState<Message[]>([
    { id: "1", content: "Olá, tudo bem?", type: "outgoing" },
    { id: "2", content: "Oi! Sim, e você?", type: "incoming" },
    { id: "3", content: "Tudo ótimo, obrigado!", type: "outgoing" },
  ]);

  const [clientNumbers, setClientNumbers] = useState<ClientNumber[]>([
    { id: "1", phoneNumber: "5511977777777", name: "Cliente 1" },
    { id: "2", phoneNumber: "5511966666666", name: "Cliente 2" },
  ]);

  const [config, setConfig] = useState<WarmingConfig>({
    minDelaySeconds: 60,
    maxDelaySeconds: 180,
    messagesPerHour: 20,
    activeHoursStart: 8,
    activeHoursEnd: 22,
  });

  const [isAddInstanceOpen, setIsAddInstanceOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<Instance | null>(null);
  const [newWarmingPhone, setNewWarmingPhone] = useState("");

  const handleAddInstance = (data: Omit<Instance, 'id' | 'status'>) => {
    const newInstance: Instance = {
      ...data,
      id: Date.now().toString(),
      status: 'disconnected',
    };
    setInstances([...instances, newInstance]);
  };

  const handleEditInstance = (instance: Instance) => {
    setEditingInstance(instance);
    setIsAddInstanceOpen(true);
  };

  const handleDeleteInstance = (id: string) => {
    setInstances(instances.filter(i => i.id !== id));
  };

  const handleToggleWarmingStatus = (id: string) => {
    if (warmingNumber && warmingNumber.id === id) {
      setWarmingNumber({
        ...warmingNumber,
        status: warmingNumber.status === 'warming' ? 'paused' : 'warming',
      });
    }
  };

  const handleAddMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      type: 'outgoing',
    };
    setMessages([...messages, newMessage]);
  };

  const handleDeleteMessage = (id: string) => {
    setMessages(messages.filter(m => m.id !== id));
  };

  const handleImportMessages = (contents: string[]) => {
    const newMessages: Message[] = contents.map((content, index) => ({
      id: `${Date.now()}-${index}`,
      content,
      type: 'outgoing',
    }));
    setMessages([...messages, ...newMessages].slice(0, 100));
  };

  const handleAddClientNumber = (phoneNumber: string, name?: string) => {
    const newClient: ClientNumber = {
      id: Date.now().toString(),
      phoneNumber,
      name,
    };
    setClientNumbers([...clientNumbers, newClient]);
  };

  const handleDeleteClientNumber = (id: string) => {
    setClientNumbers(clientNumbers.filter(c => c.id !== id));
  };

  const handleImportClientNumbers = (numbers: { phoneNumber: string; name?: string }[]) => {
    const newClients: ClientNumber[] = numbers.map((n, index) => ({
      id: `${Date.now()}-${index}`,
      phoneNumber: n.phoneNumber,
      name: n.name,
    }));
    setClientNumbers([...clientNumbers, ...newClients]);
  };

  const handleSetWarmingNumber = () => {
    if (newWarmingPhone.trim()) {
      setWarmingNumber({
        id: Date.now().toString(),
        phoneNumber: newWarmingPhone.trim(),
        status: 'idle',
        messagesSent: 0,
        messagesReceived: 0,
      });
      setNewWarmingPhone("");
    }
  };

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
            <ConfigPanel config={config} onConfigChange={setConfig} />
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
