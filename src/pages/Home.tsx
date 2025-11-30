import { FolderOpen, MessageCircleHeart, ChevronRight } from 'lucide-react';
import MobileLayout from '@/components/MobileLayout';
import BottomNav from '@/components/BottomNav';
import HealthProfile from '@/components/HealthProfile';
import PatientSelector from '@/components/PatientSelector';
import { useNavigate } from 'react-router-dom';
import mamaAvatar from '@/assets/mama-avatar.png';

const Home = () => {
  const navigate = useNavigate();

  return (
    <MobileLayout>
      <div className="px-5 pt-8 pb-28 space-y-6">
        {/* Header */}
        <PatientSelector />

        {/* Health Profile */}
        <HealthProfile />

        {/* Mama Chat Button */}
        <button
          onClick={() => navigate('/chat')}
          className="w-full p-5 bg-card rounded-2xl flex items-center gap-4 hover:shadow-md transition-all border border-border"
        >
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center overflow-hidden">
            <img
              src={mamaAvatar}
              alt="Mama"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-left flex-1">
            <h3 className="font-semibold text-foreground">Habla con Mamá</h3>
            <p className="text-sm text-muted-foreground">Tu asistente de salud</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
