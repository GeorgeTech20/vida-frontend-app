import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/MobileLayout';
import { Button } from '@/components/ui/button';
import loginBackground from '@/assets/login-background.png';
import vidaLogo from '@/assets/vida-logo-new.png';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (user) {
      const isProfileComplete = profile && profile.name && (profile.dni || profile.patient_main);
      if (isProfileComplete) {
        navigate('/', { replace: true });
      } else {
        navigate('/register', { replace: true });
      }
    }
  }, [user, profile, loading, navigate]);

  if (loading && user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) {
        toast.error('Error al iniciar sesión con Google: ' + error.message);
      }
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = () => {
    navigate('/auth');
  };

  return (
    <MobileLayout showNav={false}>
      <div className="min-h-screen flex flex-col relative">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${loginBackground})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-black/30" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10">
          <img
            src={vidaLogo}
            alt="Vida"
            className="h-24 w-auto mb-4"
          />
          <p className="text-lg font-serif text-primary-foreground/90 mt-2 italic">
            Tu salud acompañada
          </p>
        </div>

        <div className="relative z-10 bg-card/80 backdrop-blur-md rounded-t-3xl p-6 pb-8 space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 gap-3 bg-background hover:bg-muted border-border"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </Button>

          <Button
            className="w-full h-12 bg-muted hover:bg-muted/80 text-muted-foreground"
            variant="secondary"
            onClick={handleEmailSignIn}
            disabled={isLoading}
          >
            Continuar con email
          </Button>

          <div className="flex justify-center gap-6 pt-4">
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Política de privacidad
            </button>
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Términos de servicio
            </button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default Login;
