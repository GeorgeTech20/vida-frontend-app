import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Upload, FileText, Image, Trash2, Eye, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/MobileLayout';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MedicalFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  description: string | null;
  created_at: string;
}

const MedicalLibrary = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<MedicalFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<MedicalFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los archivos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Tipo de archivo no válido',
        description: 'Solo se permiten imágenes (JPG, PNG, WebP) y PDFs',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'El tamaño máximo es 10MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('medical-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Save file metadata
      const { error: dbError } = await supabase.from('medical_files').insert({
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        user_id: currentUser?.id,
      });

      if (dbError) throw dbError;

      toast({
        title: 'Archivo subido',
        description: 'El archivo se ha guardado correctamente',
      });

      fetchFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'No se pudo subir el archivo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (file: MedicalFile) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('medical-files')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('medical_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast({
        title: 'Archivo eliminado',
        description: 'El archivo se ha eliminado correctamente',
      });

      setFiles(files.filter((f) => f.id !== file.id));
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el archivo',
        variant: 'destructive',
      });
    }
  };

  const handlePreview = async (file: MedicalFile) => {
    try {
      const { data } = supabase.storage
        .from('medical-files')
        .getPublicUrl(file.file_path);

      setPreviewUrl(data.publicUrl);
      setSelectedFile(file);
    } catch (error) {
      console.error('Error getting preview:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <MobileLayout>
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-4 bg-card border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-accent rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-semibold text-foreground">Historia Clínica Digital</h1>
          <p className="text-xs text-muted-foreground">Tus archivos médicos centralizados</p>
        </div>
      </header>

      <div className="px-4 py-6 pb-32 space-y-6">
        {/* Upload Section */}
        <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
          <CardContent className="p-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full flex items-center gap-3 py-2"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                {isUploading ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground text-sm">
                  {isUploading ? 'Subiendo...' : 'Subir archivo'}
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG o PDF • Max 10MB
                </p>
              </div>
            </button>
          </CardContent>
        </Card>

        {/* Files List */}
        <div className="space-y-4">
          <h2 className="font-semibold text-foreground">
            Mis Archivos ({files.length})
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No tienes archivos médicos guardados
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sube tus recetas, análisis y documentos médicos
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {files.map((file) => (
                <Card key={file.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        {file.file_type.includes('pdf') ? (
                          <FileText className="w-6 h-6 text-primary" />
                        ) : (
                          <Image className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {file.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handlePreview(file)}
                          className="p-2 hover:bg-accent rounded-full transition-colors"
                        >
                          <Eye className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleDelete(file)}
                          className="p-2 hover:bg-destructive/10 rounded-full transition-colors"
                        >
                          <Trash2 className="w-5 h-5 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="truncate">{selectedFile?.file_name}</DialogTitle>
          </DialogHeader>
          {previewUrl && selectedFile && (
            <div className="mt-4">
              {selectedFile.file_type.includes('pdf') ? (
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 text-primary mx-auto mb-4" />
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Abrir PDF en nueva pestaña
                  </a>
                </div>
              ) : (
                <img
                  src={previewUrl}
                  alt={selectedFile.file_name}
                  className="w-full rounded-lg"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </MobileLayout>
  );
};

export default MedicalLibrary;
