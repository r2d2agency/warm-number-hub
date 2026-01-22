import { useState } from "react";
import { Message } from "@/types/warming";
import { MessageSquare, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

interface MessagesListProps {
  messages: Message[];
  onAddMessage: (content: string) => void;
  onDeleteMessage: (id: string) => void;
  onImportMessages: (messages: string[]) => void;
}

export function MessagesList({ messages, onAddMessage, onDeleteMessage, onImportMessages }: MessagesListProps) {
  const [newMessage, setNewMessage] = useState("");

  const handleAdd = () => {
    if (newMessage.trim()) {
      onAddMessage(newMessage.trim());
      setNewMessage("");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        onImportMessages(lines);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="glass-card p-4 md:p-5 animate-fade-in">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-5 h-5 text-primary shrink-0" />
          <h3 className="font-semibold text-foreground text-sm md:text-base truncate">Mensagens ({messages.length}/100)</h3>
        </div>
        <label className="cursor-pointer shrink-0">
          <input
            type="file"
            accept=".txt,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button variant="outline" size="sm" className="border-border/50 text-xs md:text-sm" asChild>
            <span>
              <Upload className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Importar</span>
            </span>
          </Button>
        </label>
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Digite uma nova mensagem..."
          className="bg-secondary border-border/50 focus:border-primary text-sm"
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button onClick={handleAdd} size="icon" className="bg-primary hover:bg-primary/90 shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="h-48 md:h-64">
        <div className="space-y-2">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className="group flex items-center justify-between bg-secondary/30 rounded-lg px-2 md:px-3 py-2 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                <span className="text-[10px] md:text-xs text-muted-foreground w-5 md:w-6 shrink-0">#{index + 1}</span>
                <p className="text-xs md:text-sm text-foreground truncate">{message.content}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeleteMessage(message.id)}
                className="opacity-100 md:opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0 h-8 w-8"
              >
                <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center py-6 md:py-8 text-muted-foreground">
              <MessageSquare className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs md:text-sm">Nenhuma mensagem cadastrada</p>
              <p className="text-[10px] md:text-xs mt-1">Adicione mensagens ou importe de um arquivo</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
