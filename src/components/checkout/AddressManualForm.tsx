import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface ManualAddressData {
  street: string;
  number: string;
  neighborhood: string;
  complement: string;
  reference: string;
}

interface AddressManualFormProps {
  data: ManualAddressData;
  onChange: (data: ManualAddressData) => void;
  errors?: Partial<Record<keyof ManualAddressData, string>>;
}

export function AddressManualForm({ data, onChange, errors }: AddressManualFormProps) {
  const handleChange = (field: keyof ManualAddressData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    onChange({ ...data, [field]: e.target.value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="street">Rua *</Label>
          <Input
            id="street"
            value={data.street}
            onChange={handleChange('street')}
            placeholder="Nome da rua"
            className={errors?.street ? 'border-destructive' : ''}
          />
          {errors?.street && (
            <p className="text-xs text-destructive">{errors.street}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="number">Número *</Label>
          <Input
            id="number"
            value={data.number}
            onChange={handleChange('number')}
            placeholder="Nº"
            className={errors?.number ? 'border-destructive' : ''}
          />
          {errors?.number && (
            <p className="text-xs text-destructive">{errors.number}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="neighborhood">Bairro *</Label>
        <Input
          id="neighborhood"
          value={data.neighborhood}
          onChange={handleChange('neighborhood')}
          placeholder="Nome do bairro"
          className={errors?.neighborhood ? 'border-destructive' : ''}
        />
        {errors?.neighborhood && (
          <p className="text-xs text-destructive">{errors.neighborhood}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="complement">Complemento</Label>
        <Input
          id="complement"
          value={data.complement}
          onChange={handleChange('complement')}
          placeholder="Apto, bloco, casa..."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reference">Ponto de Referência *</Label>
        <Input
          id="reference"
          value={data.reference}
          onChange={handleChange('reference')}
          placeholder="Ex: Próximo ao mercado..."
          className={errors?.reference ? 'border-destructive' : ''}
        />
        {errors?.reference && (
          <p className="text-xs text-destructive">{errors.reference}</p>
        )}
      </div>
    </div>
  );
}
