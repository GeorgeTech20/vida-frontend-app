import { useActivePatient } from '@/hooks/useActivePatient';
import { Activity, Ruler, Scale, Calendar } from 'lucide-react';

const HealthProfile = () => {
  const { activePatient, loading } = useActivePatient();

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!activePatient) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border">
        <p className="text-muted-foreground text-center text-sm">Sin paciente activo</p>
      </div>
    );
  }

  const { height, weight, birth_date } = activePatient;

  const calculateAge = () => {
    if (!birth_date) return null;
    const birth = new Date(birth_date);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const calculateBMI = () => {
    if (!height || !weight) return null;
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const getBMIStatus = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Bajo', color: 'text-chart-3' };
    if (bmi < 25) return { label: 'Normal', color: 'text-success' };
    if (bmi < 30) return { label: 'Alto', color: 'text-chart-3' };
    return { label: 'Obesidad', color: 'text-destructive' };
  };

  const age = calculateAge();
  const bmi = calculateBMI();
  const bmiStatus = bmi ? getBMIStatus(parseFloat(bmi)) : null;

  const stats = [
    { label: 'Altura', value: height ? `${height}` : '-', unit: 'cm', icon: Ruler },
    { label: 'Peso', value: weight ? `${weight}` : '-', unit: 'kg', icon: Scale },
    { label: 'Edad', value: age ? `${age}` : '-', unit: 'años', icon: Calendar },
    { label: 'IMC', value: bmi || '-', unit: bmiStatus?.label || '', icon: Activity, statusColor: bmiStatus?.color },
  ];

  return (
    <div className="bg-card rounded-2xl p-5 border border-border">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">Perfil de Salud</h2>
      <div className="grid grid-cols-4 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="w-10 h-10 mx-auto mb-2 bg-accent rounded-xl flex items-center justify-center">
              <stat.icon className={`w-5 h-5 ${stat.statusColor || 'text-accent-foreground'}`} />
            </div>
            <p className="text-lg font-semibold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.unit}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HealthProfile;
