import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface GalleryUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  uploadImage: (file: File, path: string) => Promise<string>;
  maxImages?: number;
}

export function GalleryUploader({
  images,
  onImagesChange,
  uploadImage,
  maxImages = 6,
}: GalleryUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(`Máximo de ${maxImages} imagens permitidas`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);

    try {
      const uploadPromises = filesToUpload.map((file, index) =>
        uploadImage(file, `gallery-${Date.now()}-${index}`)
      );

      const newUrls = await Promise.all(uploadPromises);
      onImagesChange([...images, ...newUrls]);
      toast.success(`${newUrls.length} imagem(ns) adicionada(s)`);
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload das imagens');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {images.map((url, index) => (
          <Card key={index} className="relative aspect-square overflow-hidden group">
            <img
              src={url}
              alt={`Galeria ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleRemoveImage(index)}
            >
              <X className="w-3 h-3" />
            </Button>
          </Card>
        ))}

        {images.length < maxImages && (
          <label className="cursor-pointer">
            <Card className="aspect-square flex flex-col items-center justify-center gap-1 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-colors">
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <ImagePlus className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Adicionar</span>
                </>
              )}
            </Card>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </label>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {images.length}/{maxImages} imagens • Clique para adicionar
      </p>
    </div>
  );
}
