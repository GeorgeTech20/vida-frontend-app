import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, FileText, Image as ImageIcon, Heart, Thermometer, Brain, Wind, Pill, Activity } from 'lucide-react';
import MobileLayout from '@/components/MobileLayout';
import BottomNav from '@/components/BottomNav';
import { Input } from '@/components/ui/input';
import { Message } from '@/types/health';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useChatStream } from '@/hooks/useChatStream';
import mishaAvatar from '@/assets/michi-medic.png';

// Common health concerns with icons and soft colors
const healthConcerns = [
  { id: 'headache', label: 'Dolor de cabeza', icon: Brain, color: 'from-violet-100 to-purple-100', iconColor: 'text-violet-500' },
  { id: 'fever', label: 'Fiebre', icon: Thermometer, color: 'from-rose-100 to-pink-100', iconColor: 'text-rose-500' },
  { id: 'stomach', label: 'Dolor estomacal', icon: Activity, color: 'from-amber-100 to-orange-100', iconColor: 'text-amber-500' },
  { id: 'cold', label: 'Gripe o resfriado', icon: Wind, color: 'from-sky-100 to-blue-100', iconColor: 'text-sky-500' },
  { id: 'allergy', label: 'Alergias', icon: Pill, color: 'from-emerald-100 to-teal-100', iconColor: 'text-emerald-500' },
  { id: 'heart', label: 'Malestar general', icon: Heart, color: 'from-pink-100 to-rose-100', iconColor: 'text-pink-500' },
];

// Helper function to render markdown: **bold** and * bullet lists
const formatBoldText = (text: string, keyPrefix: string = '') => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-bold-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const formatMessageContent = (content: string) => {
  const lines = content.split('\n');
  const result: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let listKey = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      result.push(
        <ul key={`list-${listKey++}`} className="list-disc list-inside my-1 space-y-0.5">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, lineIndex) => {
    const bulletMatch = line.match(/^\*\s+(.*)$/) || line.match(/^\*([^\s*].*)$/);
    
    if (bulletMatch) {
      const bulletContent = bulletMatch[1];
      currentList.push(
        <li key={`item-${lineIndex}`}>{formatBoldText(bulletContent, `li-${lineIndex}`)}</li>
      );
    } else {
      flushList();
      if (line) {
        result.push(
          <span key={`line-${lineIndex}`}>
            {formatBoldText(line, `span-${lineIndex}`)}
            {lineIndex < lines.length - 1 && <br />}
          </span>
        );
      } else if (lineIndex < lines.length - 1) {
        result.push(<br key={`br-${lineIndex}`} />);
      }
    }
  });

  flushList();
  return result;
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [hasConversation, setHasConversation] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const numericPatientId = 1;
  
  const { sendMessage: sendStreamMessage, isLoading } = useChatStream({
    patientId: numericPatientId,
    conversationId,
    onConversationIdChange: setConversationId,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startConversationWithMessage = (message: string) => {
    setHasConversation(true);
    setShowIntro(false);
    handleSendMessage(message);
  };

  const handleSendMessage = async (messageText: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    let assistantContent = '';
    const assistantId = (Date.now() + 1).toString();

    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        content: '',
        sender: 'misha',
        timestamp: new Date(),
      },
    ]);

    await sendStreamMessage(
      messageText,
      (delta) => {
        assistantContent += delta;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: assistantContent } : msg
          )
        );
      },
      () => {
        setIsTyping(false);
        if (!assistantContent) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: 'Lo siento, no pude procesar tu mensaje. Intenta de nuevo.' }
                : msg
            )
          );
        }
      }
    );
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Solo se permiten imágenes (JPG, PNG) y PDFs');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El tamaño máximo es 10MB');
      return;
    }

    setAttachedFile(file);
  };

  const uploadFile = async (file: File, description?: string): Promise<boolean> => {
    setIsUploading(true);
    try {
      const documentType = file.type.includes('pdf') ? 'OTHER' : 'MEDICAL_EXAM';
      const fileDescription = description?.trim() || `Archivo subido: ${file.name}`;

      await api.uploadDocument(file, numericPatientId, documentType, fileDescription);
      toast.success('Archivo guardado en tu historia clínica');
      return true;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(error instanceof Error ? error.message : 'Error al subir el archivo');
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() && !attachedFile) return;
    
    setShowIntro(false);
    if (!hasConversation) setHasConversation(true);

    if (attachedFile) {
      const userContext = inputValue.trim() || undefined;

      if (userContext) {
        const contextMessage: Message = {
          id: Date.now().toString(),
          content: userContext,
          sender: 'user',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, contextMessage]);
      }

      const uploaded = await uploadFile(attachedFile, userContext);
      if (uploaded) {
        const fileMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `📎 Archivo adjunto: ${attachedFile.name}`,
          sender: 'user',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, fileMessage]);
        setAttachedFile(null);
        setInputValue('');
        if (fileInputRef.current) fileInputRef.current.value = '';

        setIsTyping(true);
        setTimeout(() => {
          const mishaMessage: Message = {
            id: (Date.now() + 2).toString(),
            content: userContext
              ? `¡Perfecto! He guardado tu archivo "${attachedFile.name}" en tu Historia Clínica Digital.\n\n¿Hay algo más en lo que pueda ayudarte?`
              : '¡Perfecto! He guardado tu archivo en tu Historia Clínica Digital. Puedes acceder a él cuando lo necesites.\n\n¿Hay algo más en lo que pueda ayudarte?',
            sender: 'misha',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, mishaMessage]);
          setIsTyping(false);
        }, 1000);
      }
      return;
    }

    const currentInput = inputValue;
    setInputValue('');
    await handleSendMessage(currentInput);
  };

  // Welcome screen - Premium Health-Tech Design
  if (!hasConversation) {
    return (
      <MobileLayout>
        <div className="flex flex-col h-full bg-gradient-to-b from-teal-50/50 via-white to-cyan-50/30">
          {/* Floating orbs for ambient effect */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-teal-200/20 rounded-full blur-3xl" />
          <div className="absolute top-40 right-5 w-24 h-24 bg-cyan-200/20 rounded-full blur-3xl" />
          <div className="absolute bottom-40 left-5 w-28 h-28 bg-emerald-200/20 rounded-full blur-3xl" />

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto px-6 pt-8 pb-32 relative">
            {/* Avatar and Greeting */}
            <div className="text-center mb-8">
              <div className="relative inline-block mb-4">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-400 to-cyan-500 p-0.5 shadow-lg shadow-teal-200/50">
                  <div className="w-full h-full rounded-3xl bg-white flex items-center justify-center overflow-hidden">
                    <img src={mishaAvatar} alt="Misha" className="w-14 h-14 object-contain" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-3 border-white shadow-sm flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>
              
              <h1 className="text-2xl font-semibold text-slate-800 mb-2">
                Hola, soy <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500">Misha</span>
              </h1>
              <p className="text-slate-500 text-base">
                ¿Cómo puedo ayudarte hoy?
              </p>
            </div>

            {/* Health Concerns Grid */}
            <div className="mb-8">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4 px-1">
                Consultas frecuentes
              </p>
              <div className="grid grid-cols-2 gap-3">
                {healthConcerns.map((concern) => {
                  const Icon = concern.icon;
                  return (
                    <button
                      key={concern.id}
                      onClick={() => startConversationWithMessage(`Tengo ${concern.label.toLowerCase()}`)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl",
                        "bg-gradient-to-br", concern.color,
                        "border border-white/60 shadow-sm",
                        "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
                        "transition-all duration-200"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl bg-white/80 backdrop-blur-sm",
                        "flex items-center justify-center shadow-sm"
                      )}>
                        <Icon className={cn("w-5 h-5", concern.iconColor)} />
                      </div>
                      <span className="text-sm font-medium text-slate-700 text-left">
                        {concern.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Text Input Section */}
            <div className="mb-6">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3 px-1">
                O escribe tu consulta
              </p>
              <div className="relative">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && inputValue.trim()) {
                      startConversationWithMessage(inputValue);
                    }
                  }}
                  placeholder="Describe cómo te sientes..."
                  className="w-full pl-4 pr-12 py-4 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 text-slate-700 placeholder:text-slate-400"
                />
                <button
                  onClick={() => inputValue.trim() && startConversationWithMessage(inputValue)}
                  disabled={!inputValue.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="text-center px-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                ⚕️ Misha brinda orientación general, no diagnósticos médicos.
                <br />
                <span className="text-slate-300">Consulta siempre a un profesional de salud.</span>
              </p>
            </div>
          </div>

          <BottomNav />
        </div>
      </MobileLayout>
    );
  }

  // Chat conversation view
  return (
    <MobileLayout>
      <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-white">
        {/* Header */}
        <header className="flex items-center gap-3 px-5 py-4 bg-white/80 backdrop-blur-sm border-b border-slate-100">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 p-0.5 shadow-sm">
              <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center overflow-hidden">
                <img src={mishaAvatar} alt="Misha" className="w-7 h-7 object-contain" />
              </div>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-slate-800">Misha</h1>
            <p className="text-xs text-emerald-500 font-medium">En línea</p>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-40">
          {showIntro && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-400 to-cyan-500 p-0.5 mb-4 shadow-lg shadow-teal-200/30">
                <div className="w-full h-full rounded-3xl bg-white flex items-center justify-center">
                  <img src={mishaAvatar} alt="Misha" className="w-14 h-14 object-contain" />
                </div>
              </div>
              <p className="text-slate-600 text-center text-base">
                ¿En qué puedo ayudarte?
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.sender === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.sender === 'misha' && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 p-0.5 flex-shrink-0 self-end shadow-sm">
                      <div className="w-full h-full rounded-xl bg-white flex items-center justify-center">
                        <img src={mishaAvatar} alt="Misha" className="w-5 h-5 object-contain" />
                      </div>
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] px-4 py-3 rounded-2xl shadow-sm",
                      message.sender === 'user'
                        ? "bg-gradient-to-br from-teal-500 to-cyan-500 text-white rounded-br-md"
                        : "bg-white border border-slate-100 text-slate-700 rounded-bl-md"
                    )}
                  >
                    {message.sender === 'misha' && !message.content && isTyping ? (
                      <div className="flex gap-1 py-1">
                        <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <>
                        <div className="text-sm whitespace-pre-line">{formatMessageContent(message.content)}</div>
                        <p
                          className={cn(
                            "text-xs mt-2 opacity-70",
                            message.sender === 'user' ? "text-teal-100" : "text-slate-400"
                          )}
                        >
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-4 py-3 bg-white/90 backdrop-blur-sm border-t border-slate-100">
          {attachedFile && (
            <div className="flex items-center gap-2 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              {attachedFile.type.includes('pdf') ? (
                <FileText className="w-5 h-5 text-teal-500" />
              ) : (
                <ImageIcon className="w-5 h-5 text-cyan-500" />
              )}
              <span className="text-sm text-slate-600 truncate flex-1">{attachedFile.name}</span>
              <button
                onClick={() => {
                  setAttachedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isLoading}
              className="p-3 text-slate-400 hover:text-teal-500 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center bg-slate-50 rounded-xl border border-slate-200 pr-1">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                placeholder="Escribe tu mensaje..."
                disabled={isLoading}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-3 text-slate-700 placeholder:text-slate-400"
              />
              <button
                onClick={handleSend}
                disabled={(!inputValue.trim() && !attachedFile) || isUploading || isLoading}
                className="p-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md transition-all"
              >
                {isUploading || isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    </MobileLayout>
  );
};

export default Chat;
