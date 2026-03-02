import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Palette, RotateCcw } from 'lucide-react';
import { DEFAULT_THEME, isValidHex, type RestaurantTheme } from '@/lib/themeUtils';

interface ThemeEditorProps {
  value: RestaurantTheme;
  onChange: (theme: RestaurantTheme) => void;
}

const FIELDS: { key: keyof RestaurantTheme; label: string; hint: string }[] = [
  { key: 'primary', label: 'Cor Primária', hint: 'Botões, CTAs, destaques' },
  { key: 'secondary', label: 'Cor Secundária', hint: 'Badges, cards, fundo secundário' },
  { key: 'background', label: 'Cor de Fundo', hint: 'Background geral do site' },
  { key: 'foreground', label: 'Cor do Texto', hint: 'Textos principais' },
];

export function ThemeEditor({ value, onChange }: ThemeEditorProps) {
  const [local, setLocal] = useState<RestaurantTheme>(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleColorChange = (key: keyof RestaurantTheme, hex: string) => {
    if (!isValidHex(hex)) return;
    const next = { ...local, [key]: hex };
    setLocal(next);
    onChange(next);
  };

  const handleReset = () => {
    setLocal(DEFAULT_THEME);
    onChange(DEFAULT_THEME);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="w-4 h-4" />
            Aparência / Tema
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Restaurar Padrão
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {FIELDS.map(({ key, label, hint }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-sm">{label}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={local[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-10 h-10 rounded-md border border-input cursor-pointer p-0.5"
                />
                <div className="flex-1">
                  <span className="text-xs font-mono text-muted-foreground">{local[key]}</span>
                  <p className="text-[10px] text-muted-foreground leading-tight">{hint}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Live Preview */}
        <div
          className="rounded-lg border p-4 space-y-3"
          style={{ backgroundColor: local.background, color: local.foreground }}
        >
          <p className="text-xs font-medium opacity-60">Preview em tempo real</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-md text-sm font-medium"
              style={{ backgroundColor: local.primary, color: '#fff' }}
            >
              Botão Primário
            </button>
            <span
              className="px-2 py-1 rounded text-xs font-medium"
              style={{ backgroundColor: local.secondary, color: '#fff' }}
            >
              Badge
            </span>
          </div>
          <div
            className="rounded-md p-3 text-sm"
            style={{
              backgroundColor: `${local.secondary}15`,
              borderLeft: `3px solid ${local.primary}`,
            }}
          >
            <p style={{ color: local.foreground }}>
              Exemplo de card com texto sobre o fundo do restaurante.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
