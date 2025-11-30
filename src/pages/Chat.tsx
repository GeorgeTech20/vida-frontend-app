import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, FileText, Image as ImageIcon, Plus } from 'lucide-react';
import MobileLayout from '@/components/MobileLayout';
import BottomNav from '@/components/BottomNav';
import { Input } from '@/components/ui/input';
import { Message } from '@/types/health';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useActivePatient } from '@/hooks/useActivePatient';
import michiMedic from '@/assets/michi-medic.png';
import michiWelcome from '@/assets/michi-welcome.png';

const quickSuggestions = [
  'Dolor de barriga',
  'Calor en la frente',
  'Dolor de cabeza',
  'Tos o gripe',
];

const symptomQuestions = [
  {
    keywords: ['dolor', 'cabeza', 'cefalea'],
    followUp: '¿Hace cuánto tiempo tienes este dolor de cabeza? ¿Es constante o intermitente?',
    recommendation: 'Para el dolor de cabeza te recomiendo:\n\n• Descansar en un lugar oscuro y silencioso\n• Tomar abundante agua\n• Aplicar compresas frías en la frente\n• Si persiste más de 24 horas, consulta con un médico\n\n¿Tienes algún otro síntoma?',
  },
  {
    keywords: ['fiebre', 'temperatura', 'caliente'],
    followUp: '¿Has medido tu temperatura? ¿Tienes otros síntomas como escalofríos o sudoración?',
    recommendation: 'Para la fiebre te recomiendo:\n\n• Mantente hidratado con agua y líquidos\n• Usa ropa ligera\n• Descansa lo suficiente\n• Si la fiebre supera 38.5°C o dura más de 3 días, consulta a un médico\n\n¿Hay algo más que te preocupe?',
  },
  {
    keywords: ['estómago', 'náuseas', 'vómito', 'diarrea', 'digestión'],
    followUp: '¿Desde cuándo tienes estas molestias estomacales? ¿Has comido algo diferente recientemente?',
    recommendation: 'Para las molestias estomacales te recomiendo:\n\n• Dieta blanda (arroz, pollo, plátano)\n• Evita alimentos grasos y picantes\n• Toma líquidos en pequeños sorbos\n• Si hay sangre o los síntomas persisten, busca atención médica\n\n¿Cómo te sientes ahora?',
  },
  {
    keywords: ['cansancio', 'fatiga', 'sueño', 'agotado'],
    followUp: '¿Cuántas horas estás durmiendo? ¿Este cansancio es reciente o llevas tiempo sintiéndote así?',
    recommendation: 'Para combatir el cansancio te recomiendo:\n\n• Dormir 7-8 horas diarias\n• Hacer ejercicio ligero regularmente\n• Alimentación balanceada\n• Reducir el estrés con técnicas de relajación\n\n¿Te gustaría agendar una cita con un especialista?',
  },
  {
    keywords: ['tos', 'gripe', 'resfriado', 'congestión', 'nariz'],
    followUp: '¿La tos es seca o con flema? ¿Tienes otros síntomas como congestión nasal?',
    recommendation: 'Para los síntomas de gripe te recomiendo:\n\n• Descanso absoluto\n• Líquidos calientes (té, sopas)\n• Miel con limón para la garganta\n• Vapor de agua para la congestión\n• Si hay dificultad para respirar, consulta inmediatamente\n\n¿Necesitas más ayuda?',
  },
];

const defaultResponses = [
  'Entiendo. ¿Podrías darme más detalles sobre cómo te sientes? Por ejemplo, ¿dónde sientes las molestias?',
  'Gracias por compartir eso conmigo. ¿Hace cuánto tiempo comenzaste a sentirte así?',
  'Es importante que me cuentes más. ¿El malestar es constante o aparece en ciertos momentos?',
  '¿Hay algo que haga que te sientas mejor o peor? Cuéntame más para poder ayudarte mejor.',
];

const Chat = () => {
  const { user, profile } = useAuth();
  const { activePatient } = useActivePatient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationContext, setConversationContext] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [hasConversation, setHasConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const [showIntro, setShowIntro] = useState(true);

  const startNewConversation = () => {
    setMessages([]);
    setHasConversation(true);
    setShowIntro(true);
    setConversationContext([]);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setShowIntro(false);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: suggestion,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages([userMessage]);
    setIsTyping(true);

    setTimeout(() => {
      const response = generateResponse(suggestion);
      const michiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: 'mama',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, michiMessage]);
      setIsTyping(false);
    }, 1500);
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('medical-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const fileDescription = description?.trim()
        ? description.trim()
        : `Archivo subido: ${file.name}`;

      const { error: dbError } = await supabase.from('medical_files').insert({
        file_name: file.name,
        file_path: fileName,
        file_type: file.type,
        file_size: file.size,
        description: fileDescription,
        user_id: user?.id || null,
        patient_id: activePatient?.id || profile?.patient_active || null,
      });

      if (dbError) throw dbError;

      toast.success('Archivo guardado en tu historia clínica');
      return true;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error al subir el archivo');
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const generateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    for (const symptom of symptomQuestions) {
      if (symptom.keywords.some(keyword => lowerMessage.includes(keyword))) {
        if (conversationContext.includes(symptom.keywords[0])) {
          return symptom.recommendation;
        } else {
          setConversationContext(prev => [...prev, symptom.keywords[0]]);
          return symptom.followUp;
        }
      }
    }

    if (lowerMessage.includes('gracias') || lowerMessage.includes('thank')) {
      return '¡De nada! Recuerda que estoy aquí para ayudarte. Si tienes más preguntas sobre tu salud, no dudes en consultarme.\n\n¿Hay algo más en lo que pueda ayudarte?';
    }

    if (lowerMessage.includes('cita') || lowerMessage.includes('doctor') || lowerMessage.includes('médico')) {
      return '¡Claro! Puedo ayudarte a encontrar un especialista. Te recomiendo consultar con tu médico de confianza según los síntomas que describes.\n\n¿Te gustaría que te dé más información?';
    }

    if (lowerMessage.includes('hola') || lowerMessage.includes('buenos') || lowerMessage.includes('buenas')) {
      return '¡Hola! ¿Cómo te encuentras hoy? Cuéntame si tienes algún síntoma o malestar que te preocupe. Estoy aquí para ayudarte.';
    }

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  const handleSend = async () => {
    if (!inputValue.trim() && !attachedFile) return;
    
    setShowIntro(false);

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
          const michiMessage: Message = {
            id: (Date.now() + 2).toString(),
            content: userContext
              ? `¡Perfecto! He guardado tu archivo "${attachedFile.name}" en tu Historia Clínica Digital.\n\n¿Hay algo más en lo que pueda ayudarte?`
              : '¡Perfecto! He guardado tu archivo en tu Historia Clínica Digital. Puedes acceder a él cuando lo necesites.\n\n¿Hay algo más en lo que pueda ayudarte?',
            sender: 'mama',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, michiMessage]);
          setIsTyping(false);
        }, 1000);
      }
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const response = generateResponse(currentInput);
      const michiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: 'mama',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, michiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  // Welcome screen when no conversation
  if (!hasConversation) {
    return (
      <MobileLayout>
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-4">
            <h1 className="text-2xl font-bold text-foreground">Chat</h1>
            <button
              onClick={startNewConversation}
              className="w-8 h-8 rounded-full border border-primary flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </header>

          {/* Welcome Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
            <img 
              src={michiWelcome} 
              alt="Michi Medic" 
              className="w-32 h-32 object-contain mb-4"
            />
            <h2 className="text-lg font-semibold text-foreground mb-1">Michi Medic</h2>
            <p className="text-muted-foreground text-sm mb-6">Con amor y paz 💙</p>
            <button
              onClick={startNewConversation}
              className="flex items-center gap-2 px-6 py-3 border border-primary text-primary rounded-full font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <Plus className="w-4 h-4" />
              Iniciar Conversación
            </button>
          </div>

          <BottomNav />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <img 
            src={michiMedic} 
            alt="Michi Medic" 
            className="w-10 h-10 object-contain"
          />
          <div>
            <h1 className="font-semibold text-foreground">Michi Medic</h1>
            <p className="text-xs text-success">En línea</p>
          </div>
        </div>
        <button
          onClick={() => {
            setHasConversation(false);
            setMessages([]);
          }}
          className="w-8 h-8 rounded-full border border-primary flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </header>

      {/* Messages or Intro */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-40">
        {showIntro && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <img 
              src={michiMedic} 
              alt="Michi Medic" 
              className="w-28 h-28 object-contain mb-4"
            />
            <p className="text-foreground text-center text-base mb-8">
              ¿Coméntame qué síntoma sientes?
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
                {message.sender === 'mama' && (
                  <img 
                    src={michiMedic} 
                    alt="Michi Medic" 
                    className="w-8 h-8 object-contain flex-shrink-0 self-end"
                  />
                )}
                <div
                  className={cn(
                    "max-w-[75%] px-4 py-3 rounded-2xl",
                    message.sender === 'user'
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border text-foreground rounded-bl-md"
                  )}
                >
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                  <p
                    className={cn(
                      "text-xs mt-2",
                      message.sender === 'user' ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start">
                <img 
                  src={michiMedic} 
                  alt="Michi Medic" 
                  className="w-8 h-8 object-contain flex-shrink-0 self-end"
                />
                <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Suggestions */}
      {showIntro && messages.length === 0 && (
        <div className="px-5 pb-4">
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground">
                Soy michi medic, te puedo ayudar a llegar a qué especialista debes a ir con tu malestar.
              </p>
              <button 
                onClick={() => setShowIntro(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1.5 bg-background border border-border rounded-full text-sm text-foreground hover:bg-accent transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-5 py-3 bg-background border-t border-border">
        {attachedFile && (
          <div className="flex items-center gap-2 mb-3 p-3 bg-accent rounded-xl">
            {attachedFile.type.includes('pdf') ? (
              <FileText className="w-5 h-5 text-accent-foreground" />
            ) : (
              <ImageIcon className="w-5 h-5 text-accent-foreground" />
            )}
            <span className="text-sm text-foreground truncate flex-1">{attachedFile.name}</span>
            <button
              onClick={() => {
                setAttachedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="p-1 hover:bg-muted rounded-lg"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-3 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-card border-border rounded-xl py-6"
          />
          <button
            onClick={handleSend}
            disabled={(!inputValue.trim() && !attachedFile) || isUploading}
            className="p-3 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
      <BottomNav />
    </MobileLayout>
  );
};

export default Chat;
