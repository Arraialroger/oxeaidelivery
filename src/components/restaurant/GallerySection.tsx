import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GallerySectionProps {
  images: string[];
  restaurantName: string;
}

export function GallerySection({ images, restaurantName }: GallerySectionProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handlePrev = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === 0 ? images.length - 1 : selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === images.length - 1 ? 0 : selectedIndex + 1);
    }
  };

  return (
    <>
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Galeria</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {images.slice(0, 8).map((url, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className="aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <img
                  src={url}
                  alt={`${restaurantName} - Foto ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 z-10 text-white/80 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
          
          {selectedIndex !== null && (
            <div className="relative flex items-center justify-center min-h-[60vh]">
              <img
                src={images[selectedIndex]}
                alt={`${restaurantName} - Foto ${selectedIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain"
              />
              
              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrev}
                    className="absolute left-2 text-white hover:bg-white/20"
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNext}
                    className="absolute right-2 text-white hover:bg-white/20"
                  >
                    <ChevronRight className="w-8 h-8" />
                  </Button>
                </>
              )}
              
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
                {selectedIndex + 1} / {images.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
