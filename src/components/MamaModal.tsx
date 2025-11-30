import { useNavigate } from 'react-router-dom';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import mamaAvatar from '@/assets/mama-avatar.png';
import { SmilePlus, Frown } from 'lucide-react';

interface MamaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MamaModal = ({ open, onOpenChange }: MamaModalProps) => {
  const navigate = useNavigate();

  const handleOption = (feeling: 'good' | 'bad') => {
    onOpenChange(false);
    navigate('/chat', { state: { initialFeeling: feeling } });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-6 pb-8 pt-4">
        <div className="flex flex-col items-center gap-6 text-center">
          <img
            src={mamaAvatar}
            alt="Misha"
            className="w-20 h-20 rounded-full shadow-md"
          />

          <DrawerTitle className="text-xl font-semibold text-foreground">
            ¿Cómo te sientes hoy?
          </DrawerTitle>

          <div className="flex gap-4 w-full max-w-xs">
            <button
              onClick={() => handleOption('good')}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl bg-green-500/10 hover:bg-green-500/20 transition-colors border border-green-500/20"
            >
              <SmilePlus className="w-8 h-8 text-green-500" />
              <span className="text-sm font-medium text-foreground">Bien</span>
            </button>
            <button
              onClick={() => handleOption('bad')}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 transition-colors border border-orange-500/20"
            >
              <Frown className="w-8 h-8 text-orange-500" />
              <span className="text-sm font-medium text-foreground">No tan bien</span>
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default MamaModal;
