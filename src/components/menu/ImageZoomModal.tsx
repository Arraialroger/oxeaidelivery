import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageZoomModalProps {
  imageUrl: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageZoomModal({ imageUrl, alt, isOpen, onClose }: ImageZoomModalProps) {
  // Fechar com ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center bg-black/90 animate-fade-in",
        "touch-none"
      )}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Imagem ampliada: ${alt}`}
    >
      {/* Botão de fechar */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        aria-label="Fechar visualização"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Imagem ampliada */}
      <img
        src={imageUrl}
        alt={alt}
        className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Instrução para fechar */}
      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        Toque em qualquer lugar para fechar
      </p>
    </div>
  );
}
