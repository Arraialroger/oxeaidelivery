import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AspectRatio } from '@/components/ui/aspect-ratio';

interface ImageUploaderProps {
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  uploadImage: (file: File, path: string) => Promise<string>;
  label: string;
  path: string;
  aspectRatio?: number;
  className?: string;
}

export function ImageUploader({
  imageUrl,
  onImageChange,
  uploadImage,
  label,
  path,
  aspectRatio = 1,
  className = '',
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const url = await uploadImage(file, path);
      onImageChange(url);
      toast.success(`${label} atualizado com sucesso`);
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error(`Erro ao fazer upload do ${label.toLowerCase()}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = () => {
    onImageChange(null);
  };

  return (
    <div className={className}>
      {imageUrl ? (
        <Card className="relative overflow-hidden group">
          <AspectRatio ratio={aspectRatio}>
            <img
              src={imageUrl}
              alt={label}
              className="w-full h-full object-cover"
            />
          </AspectRatio>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <label className="cursor-pointer">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="pointer-events-none"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Alterar'
                )}
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
            </label>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ) : (
        <label className="cursor-pointer block">
          <Card className="border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-colors">
            <AspectRatio ratio={aspectRatio}>
              <div className="flex flex-col items-center justify-center h-full gap-2">
                {isUploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <ImagePlus className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </>
                )}
              </div>
            </AspectRatio>
          </Card>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
        </label>
      )}
    </div>
  );
}
