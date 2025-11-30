import { FolderOpen, HeartPulse, ChevronRight, LogOut } from 'lucide-react';
import MobileLayout from '@/components/MobileLayout';
import BottomNav from '@/components/BottomNav';
import HealthProfile from '@/components/HealthProfile';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useActivePatient } from '@/hooks/useActivePatient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Home = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { activePatient } = useActivePatient();

  const displayName = activePatient 
    ? activePatient.first_name
    : profile?.name || 'Usuario';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getInitials = () => {
    if (activePatient) {
      return `${activePatient.first_name.charAt(0)}${activePatient.last_name.charAt(0)}`.toUpperCase();
    }
    return profile?.name?.charAt(0).toUpperCase() || 'U';
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error al cerrar sesión');
    } else {
      navigate('/auth');
    }
  };

  return (
    <MobileLayout>
      <div className="px-5 pt-8 pb-28 space-y-6">
        {/* Header */}
        <header className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-muted-foreground text-sm mb-1">{getGreeting()}</p>
            <h1 className="text-2xl font-bold text-foreground">
              Hola, <span className="text-primary">{displayName}!</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Tu salud acompañada</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleLogout}
              className="p-2 bg-card border border-border rounded-xl hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <Avatar className="w-12 h-12 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Health Profile */}
        <HealthProfile />

        {/* Mama Chat Button */}
        <button
          onClick={() => navigate('/chat')}
          className="w-full p-5 bg-primary/5 rounded-2xl flex items-center gap-4 hover:bg-primary/10 transition-all border border-primary/20"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <HeartPulse className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="text-left flex-1">
            <h3 className="font-semibold text-foreground">Habla con Michi Medic</h3>
            <p className="text-sm text-muted-foreground">Tu asistente de salud 24/7</p>
          </div>
          <ChevronRight className="w-5 h-5 text-primary" />
        </button>

        {/* Medical Library CTA */}
        <button
          onClick={() => navigate('/library')}
          className="w-full p-5 bg-card rounded-2xl flex items-center gap-4 text-left hover:shadow-md transition-all border border-border"
        >
          <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-accent-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Historia Clínica</h3>
            <p className="text-sm text-muted-foreground">Tus documentos médicos</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <BottomNav />
    </MobileLayout>
  );
};

export default Home;
