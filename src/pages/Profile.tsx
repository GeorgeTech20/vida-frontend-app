import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/MobileLayout';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AvatarUpload } from '@/components/molecules/AvatarUpload';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  User,
  Edit2,
  Plus,
  Users,
  Phone,
  Ruler,
  Scale,
  Heart,
  ChevronRight,
  LogOut,
  Trash2,
  AlertTriangle,
  Loader2
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
    if (bmi < 18.5) return { label: 'Bajo peso', color: 'text-chart-4' };
    if (bmi < 25) return { label: 'Normal', color: 'text-chart-2' };
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

      await supabase
        .from('medical_files')
        .delete()
        .eq('user_id', user.id);

      await supabase
        .from('patients_app')
        .delete()
        .eq('user_id', user.id);

      await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      toast.success('Todos tus datos han sido eliminados. Cerrando sesión...');

      await new Promise(resolve => setTimeout(resolve, 1500));

      await signOut();
      navigate('/login');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error('Error al eliminar la cuenta. Por favor, contacta al soporte.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <BottomNav />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="px-4 pt-6 pb-24 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
          <button
            onClick={handleSignOut}
            className="p-2 bg-card border border-border rounded-full hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </button>
        </header>

        {/* Main Patient Profile */}
        {mainPatient && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AvatarUpload
                    currentAvatarUrl={profile?.avatar_url}
                    fallbackText={`${mainPatient.first_name.charAt(0)}${mainPatient.last_name.charAt(0)}`.toUpperCase()}
                    userId={user?.id || ''}
                    onAvatarChange={() => {
                      refreshProfile();
                    }}
                    size="lg"
                    editable={false}
                  />
                  <div>
                    <CardTitle className="text-lg">
                      {mainPatient.first_name} {mainPatient.last_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {calculateAge(mainPatient.birth_date)} años • DNI: {mainPatient.dni}
                    </p>
                  </div>
                </div>
                <Sheet open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                  <SheetTrigger asChild>
                    <button className="p-2 hover:bg-accent rounded-full transition-colors">
                      <Edit2 className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
                    <SheetHeader>
                      <SheetTitle className="text-left text-xl">Editar Perfil</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-6 pt-6 pb-8">
                      <div className="flex flex-col items-center gap-4">
                        <AvatarUpload
                          currentAvatarUrl={profile?.avatar_url}
                          fallbackText={`${mainPatient.first_name.charAt(0)}${mainPatient.last_name.charAt(0)}`.toUpperCase()}
                          userId={user?.id || ''}
                          onAvatarChange={() => {
                            refreshProfile();
                          }}
                          size="lg"
                          editable={true}
                        />
                        <p className="text-sm text-muted-foreground text-center">
                          Toca la foto para cambiarla
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Teléfono</label>
                          <Input
                            placeholder="+51 999 999 999"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-full"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">Altura (cm)</label>
                            <Input
                              type="number"
                              value={editForm.height}
                              onChange={(e) => setEditForm({ ...editForm, height: parseInt(e.target.value) || 0 })}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground mb-2 block">Peso (kg)</label>
                            <Input
                              type="number"
                              value={editForm.weight}
                              onChange={(e) => setEditForm({ ...editForm, weight: parseInt(e.target.value) || 0 })}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 pt-4">
                        <Button onClick={handleUpdateProfile} className="w-full" size="lg">
                          Guardar Cambios
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsEditingProfile(false)}
                          className="w-full"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center p-3 bg-muted/50 rounded-xl">
                  <Phone className="w-5 h-5 text-primary mb-1" />
                  <span className="text-xs text-muted-foreground">Teléfono</span>
                  <span className="text-sm font-medium text-foreground truncate max-w-full">
                    {mainPatient.phone || 'Sin registro'}
                  </span>
                </div>
                <div className="flex flex-col items-center p-3 bg-muted/50 rounded-xl">
                  <Ruler className="w-5 h-5 text-primary mb-1" />
                  <span className="text-xs text-muted-foreground">Altura</span>
                  <span className="text-sm font-medium text-foreground">
                    {mainPatient.height ? `${mainPatient.height} cm` : '-'}
                  </span>
                </div>
                <div className="flex flex-col items-center p-3 bg-muted/50 rounded-xl">
                  <Scale className="w-5 h-5 text-primary mb-1" />
                  <span className="text-xs text-muted-foreground">Peso</span>
                  <span className="text-sm font-medium text-foreground">
                    {mainPatient.weight ? `${mainPatient.weight} kg` : '-'}
                  </span>
                </div>
              </div>

              {mainPatient.height && mainPatient.weight && (
                <div className="mt-4 p-4 bg-primary/5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Heart className="w-6 h-6 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Índice de Masa Corporal</p>
                      <p className="text-xl font-bold text-foreground">
                        {calculateBMI(mainPatient.height, mainPatient.weight)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${getBMIStatus(parseFloat(calculateBMI(mainPatient.height, mainPatient.weight) || '0')).color}`}>
                    {getBMIStatus(parseFloat(calculateBMI(mainPatient.height, mainPatient.weight) || '0')).label}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Family Groups */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Grupo Familiar</h2>
            </div>
            <Dialog open={isAddingFamily} onOpenChange={setIsAddingFamily}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
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
                    <label className="text-sm font-medium text-foreground">DNI *</label>
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
                      <label className="text-sm font-medium text-foreground">Nombre *</label>
                      <Input
                        placeholder="Juan"
                        value={familyForm.first_name}
                        onChange={(e) => setFamilyForm({ ...familyForm, first_name: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Apellido *</label>
                      <Input
                        placeholder="Pérez"
                        value={familyForm.last_name}
                        onChange={(e) => setFamilyForm({ ...familyForm, last_name: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Fecha de Nacimiento *</label>
                    <Input
                      type="date"
                      value={familyForm.birth_date}
                      onChange={(e) => setFamilyForm({ ...familyForm, birth_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Altura (cm)</label>
                      <Input
                        type="number"
                        placeholder="170"
                        value={familyForm.height}
                        onChange={(e) => setFamilyForm({ ...familyForm, height: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Peso (kg)</label>
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
                    <label className="text-sm font-medium text-foreground">Género</label>
                    <div className="flex gap-4 mt-2">
                      <button
                        type="button"
                        onClick={() => setFamilyForm({ ...familyForm, gender: 'M' })}
                        className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                          familyForm.gender === 'M'
                            ? 'border-primary bg-primary/10'
                            : 'border-border'
                        }`}
                      >
                        Hombre
                      </button>
                      <button
                        type="button"
                        onClick={() => setFamilyForm({ ...familyForm, gender: 'F' })}
                        className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                          familyForm.gender === 'F'
                            ? 'border-primary bg-primary/10'
                            : 'border-border'
                        }`}
                      >
                        Mujer
                      </button>
                    </div>
                  </div>
                  <Button onClick={handleAddFamily} className="w-full">
                    Agregar Familiar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {familyPatients.length > 0 ? (
            <div className="space-y-3">
              {familyPatients.map((patient) => {
                const bmi = calculateBMI(patient.height, patient.weight);
                const bmiStatus = bmi ? getBMIStatus(parseFloat(bmi)) : null;

                return (
                  <Card key={patient.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-secondary/50 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-secondary-foreground" />
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">
                              {patient.first_name} {patient.last_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {calculateAge(patient.birth_date)} años
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>

                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            {patient.height && (
                              <span className="text-muted-foreground">
                                <Ruler className="w-4 h-4 inline mr-1" />
                                {patient.height} cm
                              </span>
                            )}
                            {patient.weight && (
                              <span className="text-muted-foreground">
                                <Scale className="w-4 h-4 inline mr-1" />
                                {patient.weight} kg
                              </span>
                            )}
                          </div>
                          {bmi && bmiStatus && (
                            <span className={`font-medium ${bmiStatus.color}`}>
                              IMC: {bmi} - {bmiStatus.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Aún no tienes familiares agregados
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Agrega a tu familia para monitorear su salud
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Delete Account Section */}
        <section className="pt-6 border-t border-border">
          <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full"
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar Cuenta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Confirmar Eliminación de Cuenta
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-foreground">
                  Esta acción es <strong className="text-destructive">irreversible</strong>. Se eliminará permanentemente:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                  <li>Tu perfil y datos personales</li>
                  <li>Todos los pacientes registrados</li>
                  <li>Todos los archivos médicos subidos</li>
                  <li>Todas las conversaciones y mensajes</li>
                  <li>Tu foto de perfil</li>
                  <li>Tu cuenta de autenticación</li>
                </ul>
                <p className="text-sm font-medium text-foreground">
                  ¿Estás seguro de que deseas eliminar tu cuenta?
                </p>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1"
                    disabled={deleting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    className="flex-1"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Sí, Eliminar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </section>
      </div>
      <BottomNav />
    </MobileLayout>
  );
};

export default Profile;
