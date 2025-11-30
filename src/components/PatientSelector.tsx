import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown, Check, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Patient {
  id: string;
  dni: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  height: number | null;
  weight: number | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  user_id: string;
}

const PatientSelector = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchPatients();
    }
  }, [user?.id]);

  useEffect(() => {
    const configureDefaultPatient = async () => {
      if (!user?.id || !profile || patients.length === 0) return;
      
      if (!profile.patient_main || !profile.patient_active) {
        const firstPatient = patients[0];
        await supabase
          .from('profiles')
          .update({
            patient_main: profile.patient_main || firstPatient.id,
            patient_active: profile.patient_active || firstPatient.id
          })
          .eq('user_id', user.id);
        refreshProfile();
      }
    };

    configureDefaultPatient();
  }, [patients, profile, user?.id]);

  const fetchPatients = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients_app')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = async (patientId: string) => {
    if (!user?.id) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ patient_active: patientId })
        .eq('user_id', user.id);
      
      refreshProfile();
      setOpen(false);
    } catch (error) {
      console.error('Error selecting patient:', error);
    }
  };

  const sortedPatients = [...patients].sort((a, b) => {
    if (a.id === profile?.patient_main) return -1;
    if (b.id === profile?.patient_main) return 1;
    return 0;
  });

  const activePatient = patients.find(p => p.id === profile?.patient_active);
  
  const displayName = activePatient 
    ? `${activePatient.first_name} ${activePatient.last_name}`
    : profile?.name || user?.email?.split('@')[0] || 'Usuario';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-3 w-full text-left">
          <Avatar className="w-12 h-12 border-2 border-primary/20">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">{getGreeting()}</p>
            <div className="flex items-center gap-1">
              <p className="font-semibold text-foreground truncate">{displayName}</p>
              {patients.length > 1 && (
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          </div>
        </button>
      </PopoverTrigger>
      
      {patients.length > 1 && (
        <PopoverContent className="w-72 p-2" align="start">
          <p className="text-xs text-muted-foreground px-3 py-2">Seleccionar paciente</p>
          <div className="space-y-1">
            {sortedPatients.map((patient) => {
              const isMain = patient.id === profile?.patient_main;
              const isActive = patient.id === profile?.patient_active;
              
              return (
                <button
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
                    isActive ? "bg-accent" : "hover:bg-muted"
                  )}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {getInitials(`${patient.first_name} ${patient.last_name}`)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {patient.first_name} {patient.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">DNI: {patient.dni}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isMain && <Star className="w-4 h-4 text-chart-3 fill-chart-3" />}
                    {isActive && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
};

export default PatientSelector;
