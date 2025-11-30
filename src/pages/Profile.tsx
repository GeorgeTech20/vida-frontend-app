import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/MobileLayout';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AvatarUpload } from '@/components/molecules/AvatarUpload';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Edit2,
  Plus,
  Users,
  Phone,
  Ruler,
  Scale,
  Activity,
  ChevronRight,
  LogOut,
  Trash2,
  AlertTriangle,
  Loader2,
  Mail,
  Calendar
} from 'lucide-react';

interface Patient {
  id: string;
  dni: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  height: number | null;
  weight: number | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  user_id: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [mainPatient, setMainPatient] = useState<Patient | null>(null);
  const [familyPatients, setFamilyPatients] = useState<Patient[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingFamily, setIsAddingFamily] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const [editForm, setEditForm] = useState({
    phone: '',
    height: 0,
    weight: 0
  });

  const [familyForm, setFamilyForm] = useState({
    dni: '',
    first_name: '',
    last_name: '',
    birth_date: '',
    height: '',
    weight: '',
    gender: ''
  });

  useEffect(() => {
    fetchPatients();
  }, [user, profile]);

  const fetchPatients = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data: patients, error } = await supabase
        .from('patients_app')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      if (patients && patients.length > 0) {
        const main = patients.find(p => p.id === profile?.patient_main);
        if (main) {
          setMainPatient(main);
          setEditForm({
            phone: main.phone || '',
            height: main.height || 170,
            weight: main.weight || 70
          });
        }

        const family = patients.filter(p => p.id !== profile?.patient_main);
        setFamilyPatients(family);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const calculateBMI = (height: number | null, weight: number | null) => {
    if (!height || !weight) return null;
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const getBMIStatus = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Bajo peso', color: 'text-chart-3' };
    if (bmi < 25) return { label: 'Normal', color: 'text-success' };
    if (bmi < 30) return { label: 'Sobrepeso', color: 'text-chart-3' };
    return { label: 'Obesidad', color: 'text-destructive' };
  };

  const handleUpdateProfile = async () => {
    if (!mainPatient) return;

    try {
      const { error } = await supabase
        .from('patients_app')
        .update({
          phone: editForm.phone,
          height: editForm.height,
          weight: editForm.weight
        })
        .eq('id', mainPatient.id);

      if (error) throw error;

      toast.success('Perfil actualizado');
      setIsEditingProfile(false);
      fetchPatients();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar perfil');
    }
  };

  const handleAddFamily = async () => {
    if (!familyForm.dni || !familyForm.first_name || !familyForm.last_name || !familyForm.birth_date) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('patients_app')
        .insert({
          dni: familyForm.dni,
          first_name: familyForm.first_name,
          last_name: familyForm.last_name,
          birth_date: familyForm.birth_date,
          height: familyForm.height ? parseInt(familyForm.height) : null,
          weight: familyForm.weight ? parseInt(familyForm.weight) : null,
          gender: familyForm.gender || null,
          user_id: user.id
        });

      if (error) throw error;

      toast.success('Familiar agregado');
      setIsAddingFamily(false);
      setFamilyForm({
        dni: '',
        first_name: '',
        last_name: '',
        birth_date: '',
        height: '',
        weight: '',
        gender: ''
      });
      fetchPatients();
    } catch (error: any) {
      console.error('Error adding family:', error);
      if (error.message?.includes('duplicate') || error.code === '23505') {
        toast.error('Ya existe un paciente con ese DNI');
      } else {
        toast.error('Error al agregar familiar');
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    setDeleting(true);
    try {
      const { data: medicalFiles } = await supabase
        .from('medical_files')
        .select('file_path')
        .eq('user_id', user.id);

      if (medicalFiles && medicalFiles.length > 0) {
        const filePaths = medicalFiles.map(file => file.file_path);
        await supabase.storage.from('medical-files').remove(filePaths);
      }

      await supabase.from('medical_files').delete().eq('user_id', user.id);
      await supabase.from('patients_app').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('user_id', user.id);

      toast.success('Cuenta eliminada correctamente');
      await new Promise(resolve => setTimeout(resolve, 1500));
      await signOut();
      navigate('/login');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error('Error al eliminar la cuenta');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="px-5 pt-8 pb-28 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
          <button
            onClick={handleSignOut}
            className="p-3 bg-card border border-border rounded-xl hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </button>
        </header>

        {/* Main Profile Card */}
        {mainPatient && (
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <AvatarUpload
                    currentAvatarUrl={profile?.avatar_url}
                    fallbackText={`${mainPatient.first_name.charAt(0)}${mainPatient.last_name.charAt(0)}`.toUpperCase()}
                    userId={user?.id || ''}
                    onAvatarChange={() => refreshProfile()}
                    size="lg"
                    editable={false}
                  />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {mainPatient.first_name} {mainPatient.last_name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {calculateAge(mainPatient.birth_date)} años
                    </p>
                  </div>
                </div>
                <Sheet open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                  <SheetTrigger asChild>
                    <button className="p-2 hover:bg-muted rounded-xl transition-colors">
                      <Edit2 className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
                    <SheetHeader>
                      <SheetTitle className="text-left">Editar Perfil</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-6 pt-6">
                      <div className="flex flex-col items-center gap-4">
                        <AvatarUpload
                          currentAvatarUrl={profile?.avatar_url}
                          fallbackText={`${mainPatient.first_name.charAt(0)}${mainPatient.last_name.charAt(0)}`.toUpperCase()}
                          userId={user?.id || ''}
                          onAvatarChange={() => refreshProfile()}
                          size="lg"
                          editable={true}
                        />
                        <p className="text-sm text-muted-foreground">Toca para cambiar foto</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Teléfono</label>
                          <Input
                            placeholder="+51 999 999 999"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">Altura (cm)</label>
                            <Input
                              type="number"
                              value={editForm.height}
                              onChange={(e) => setEditForm({ ...editForm, height: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">Peso (kg)</label>
                            <Input
                              type="number"
                              value={editForm.weight}
                              onChange={(e) => setEditForm({ ...editForm, weight: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pt-4">
                        <Button onClick={handleUpdateProfile} className="w-full" size="lg">
                          Guardar Cambios
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditingProfile(false)} className="w-full">
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Personal Info */}
              <div className="space-y-3">
                <InfoRow icon={Mail} label="Email" value={user?.email || '-'} />
                <InfoRow icon={Phone} label="Teléfono" value={mainPatient.phone || '-'} />
                <InfoRow icon={Calendar} label="DNI" value={mainPatient.dni} />
              </div>

              {/* Health Stats */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                <StatCard icon={Ruler} label="Altura" value={mainPatient.height ? `${mainPatient.height} cm` : '-'} />
                <StatCard icon={Scale} label="Peso" value={mainPatient.weight ? `${mainPatient.weight} kg` : '-'} />
                <StatCard 
                  icon={Activity} 
                  label="IMC" 
                  value={calculateBMI(mainPatient.height, mainPatient.weight) || '-'}
                  subtext={mainPatient.height && mainPatient.weight ? getBMIStatus(parseFloat(calculateBMI(mainPatient.height, mainPatient.weight) || '0')).label : undefined}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Family Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Grupo Familiar</h2>
            </div>
            <Dialog open={isAddingFamily} onOpenChange={setIsAddingFamily}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl">
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Agregar Familiar</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium">DNI *</label>
                    <Input
                      placeholder="12345678"
                      value={familyForm.dni}
                      onChange={(e) => setFamilyForm({ ...familyForm, dni: e.target.value.replace(/\D/g, '') })}
                      maxLength={8}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Nombre *</label>
                      <Input
                        placeholder="Juan"
                        value={familyForm.first_name}
                        onChange={(e) => setFamilyForm({ ...familyForm, first_name: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Apellido *</label>
                      <Input
                        placeholder="Pérez"
                        value={familyForm.last_name}
                        onChange={(e) => setFamilyForm({ ...familyForm, last_name: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Fecha de Nacimiento *</label>
                    <Input
                      type="date"
                      value={familyForm.birth_date}
                      onChange={(e) => setFamilyForm({ ...familyForm, birth_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Altura (cm)</label>
                      <Input
                        type="number"
                        placeholder="170"
                        value={familyForm.height}
                        onChange={(e) => setFamilyForm({ ...familyForm, height: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Peso (kg)</label>
                      <Input
                        type="number"
                        placeholder="70"
                        value={familyForm.weight}
                        onChange={(e) => setFamilyForm({ ...familyForm, weight: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Género</label>
                    <select
                      value={familyForm.gender}
                      onChange={(e) => setFamilyForm({ ...familyForm, gender: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Seleccionar</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setIsAddingFamily(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button onClick={handleAddFamily} className="flex-1">
                      Agregar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {familyPatients.length === 0 ? (
            <Card className="border-border">
              <CardContent className="p-6 text-center">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No tienes familiares registrados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {familyPatients.map((patient) => (
                <Card key={patient.id} className="border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                        <span className="text-sm font-semibold text-accent-foreground">
                          {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{patient.first_name} {patient.last_name}</p>
                        <p className="text-xs text-muted-foreground">{calculateAge(patient.birth_date)} años</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Account Info */}
        <section className="space-y-3">
          <h2 className="font-semibold text-foreground">Cuenta</h2>
          <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogTrigger asChild>
              <button className="w-full p-4 bg-card rounded-xl border border-border flex items-center gap-3 hover:bg-destructive/5 transition-colors">
                <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-destructive">Eliminar cuenta</p>
                  <p className="text-xs text-muted-foreground">Elimina todos tus datos</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Eliminar Cuenta
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  Esta acción eliminará permanentemente tu cuenta y todos tus datos. Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting} className="flex-1">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Eliminar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </section>
      </div>
      <BottomNav />
    </MobileLayout>
  );
};

// Helper Components
const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="flex items-center gap-3 py-2">
    <Icon className="w-4 h-4 text-muted-foreground" />
    <span className="text-sm text-muted-foreground flex-1">{label}</span>
    <span className="text-sm font-medium text-foreground">{value}</span>
  </div>
);

const StatCard = ({ icon: Icon, label, value, subtext }: { icon: any; label: string; value: string; subtext?: string }) => (
  <div className="bg-accent/50 rounded-xl p-3 text-center">
    <Icon className="w-5 h-5 text-accent-foreground mx-auto mb-1" />
    <p className="text-lg font-semibold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{subtext || label}</p>
  </div>
);

export default Profile;
