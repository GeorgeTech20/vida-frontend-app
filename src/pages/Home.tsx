import { useState } from 'react';
import { FolderOpen, MessageCircleHeart, LogOut } from 'lucide-react';
import MobileLayout from '@/components/MobileLayout';
import BottomNav from '@/components/BottomNav';
import HealthProfile from '@/components/HealthProfile';
import PatientSelector from '@/components/PatientSelector';
import MamaModal from '@/components/MamaModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import mamaAvatar from '@/assets/mama-avatar.png';

const Home = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showMamaModal, setShowMamaModal] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <MobileLayout>
      <div className="px-4 pt-6 pb-24 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <PatientSelector />
          <button
            onClick={handleSignOut}
            className="p-2 bg-card border border-border rounded-full hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </button>
        </header>

        {/* Health Profile */}
        <HealthProfile />

        {/* Mama Chat Button */}
        <button
          onClick={() => setShowMamaModal(true)}
          className="w-full p-4 bg-card border border-border rounded-2xl flex items-center gap-4 hover:bg-accent/50 transition-colors shadow-sm"
        >
          <img
            src={mamaAvatar}
            alt="Mama"
            className="w-12 h-12 rounded-full"
          />
          <div className="text-left flex-1">
            <h3 className="font-semibold text-foreground">Habla con Mamá</h3>
            <p className="text-sm text-muted-foreground">Tu asistente de salud</p>
          </div>
          <MessageCircleHeart className="w-6 h-6 text-primary" />
        </button>

        {/* Medical Library CTA */}
        <button
          onClick={() => navigate('/library')}
          className="w-full p-4 bg-card border border-border rounded-2xl flex items-center gap-4 text-left hover:bg-accent transition-colors"
        >
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Historia Clínica Digital</h3>
            <p className="text-sm text-muted-foreground">Centraliza tus documentos</p>
          </div>
        </button>
      </div>

      <MamaModal open={showMamaModal} onOpenChange={setShowMamaModal} />
      <BottomNav />
    </MobileLayout>
  );
};

export default Home;
