import { useState, useRef } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  fallbackText: string;
  userId: string;
  onAvatarChange: (newAvatarUrl: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
}

export const AvatarUpload = ({
  currentAvatarUrl,
  fallbackText,
  userId,
  onAvatarChange,
  size = 'md',
  editable = true,
}: AvatarUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  // Eliminar avatar anterior del storage
  const deleteOldAvatar = async (avatarUrl: string) => {
    try {
      // Extraer el path del avatar desde la URL
      const urlParts = avatarUrl.split('/avatars/');
      if (urlParts.length !== 2) return;

      const filePath = urlParts[1];
      const { error } = await supabase.storage.from('avatars').remove([filePath]);

      if (error) {
        console.error('Error deleting old avatar:', error);
      }
    } catch (error) {
      console.error('Error deleting old avatar:', error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 2MB');
      return;
    }

    setIsUploading(true);

    try {
      // Si existe un avatar anterior de nuestra app (no de OAuth), eliminarlo
      if (currentAvatarUrl && currentAvatarUrl.includes('/avatars/')) {
        await deleteOldAvatar(currentAvatarUrl);
      }

      // Subir nueva imagen
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Verificar que el bucket exista primero
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) {
        console.error('Error checking buckets:', bucketError);
        throw new Error('No se pudo verificar los buckets de storage');
      }

      const avatarsBucket = buckets?.find(b => b.id === 'avatars');
      if (!avatarsBucket) {
        throw new Error('El bucket de avatares no existe. Por favor, aplica la migración de base de datos.');
      }

      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Actualizar perfil en base de datos
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // Actualizar preview y notificar al padre
      setPreviewUrl(publicUrl);
      onAvatarChange(publicUrl);
      toast.success('Foto de perfil actualizada');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      // Mostrar mensaje de error más específico
      const errorMessage = error?.message || 'Error desconocido';
      console.error('Error details:', {
        message: errorMessage,
        statusCode: error?.statusCode,
        error: error
      });

      // Mensajes de error más específicos
      if (errorMessage.includes('Bucket not found') || errorMessage.includes('does not exist')) {
        toast.error('El bucket de avatares no existe. Contacta al administrador.');
      } else if (errorMessage.includes('new row violates row-level security policy')) {
        toast.error('No tienes permisos para subir archivos. Verifica tu sesión.');
      } else if (errorMessage.includes('duplicate')) {
        toast.error('Ya existe un archivo con ese nombre. Intenta de nuevo.');
      } else {
        toast.error(`Error al subir la foto: ${errorMessage}`);
      }
    } finally {
      setIsUploading(false);
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!currentAvatarUrl) return;

    setIsUploading(true);

    try {
      // Si es avatar de nuestra app, eliminarlo del storage
      if (currentAvatarUrl.includes('/avatars/')) {
        await deleteOldAvatar(currentAvatarUrl);
      }

      // Actualizar perfil en base de datos
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      setPreviewUrl(null);
      onAvatarChange(null);
      toast.success('Foto de perfil eliminada');
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error('Error al eliminar la foto');
    } finally {
      setIsUploading(false);
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className="relative inline-block">
      <Avatar className={cn(sizeClasses[size], 'ring-2 ring-border')}>
        <AvatarImage src={displayUrl || undefined} alt="Avatar" />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
          {fallbackText}
        </AvatarFallback>
      </Avatar>

      {editable && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md">
              <Loader2 className={cn(iconSizes[size], 'text-primary-foreground animate-spin')} />
            </div>
          ) : displayUrl ? (
            <div className="absolute -bottom-1 -right-1 flex gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                aria-label="Cambiar foto"
              >
                <Camera className={cn(iconSizes[size], 'text-primary-foreground')} />
              </button>
              <button
                onClick={handleRemoveAvatar}
                className="w-8 h-8 bg-destructive rounded-full flex items-center justify-center shadow-md hover:bg-destructive/90 transition-colors"
                aria-label="Eliminar foto"
              >
                <X className={cn(iconSizes[size], 'text-destructive-foreground')} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
              aria-label="Subir foto"
            >
              <Camera className={cn(iconSizes[size], 'text-primary-foreground')} />
            </button>
          )}
        </>
      )}
    </div>
  );
};
