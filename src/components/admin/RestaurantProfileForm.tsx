import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { GalleryUploader } from './GalleryUploader';
import { ImageUploader } from './ImageUploader';
import { useRestaurantProfile, UpdateProfileData } from '@/hooks/useRestaurantProfile';
import { Loader2, Save, Instagram, Store, Image } from 'lucide-react';

const PAYMENT_OPTIONS = [
  { id: 'pix', label: 'PIX' },
  { id: 'dinheiro', label: 'Dinheiro' },
  { id: 'credito', label: 'Cartão de Crédito' },
  { id: 'debito', label: 'Cartão de Débito' },
];

const formSchema = z.object({
  logo_url: z.string().optional().nullable(),
  hero_banner_url: z.string().optional().nullable(),
  description: z.string().max(500, 'Máximo 500 caracteres').optional().nullable(),
  instagram: z.string().max(50).optional().nullable(),
  facebook: z.string().max(100).optional().nullable(),
  whatsapp: z.string().max(15).optional().nullable(),
  phone: z.string().max(15).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  min_order: z.coerce.number().min(0).optional().nullable(),
  avg_delivery_time: z.coerce.number().min(1).max(180).optional().nullable(),
  accepted_payments: z.array(z.string()),
  gallery_urls: z.array(z.string()),
});

type FormData = z.infer<typeof formSchema>;

export function RestaurantProfileForm() {
  const { profile, isLoading, update, isUpdating, uploadImage } = useRestaurantProfile();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      logo_url: null,
      hero_banner_url: null,
      description: '',
      instagram: '',
      facebook: '',
      whatsapp: '',
      phone: '',
      address: '',
      min_order: 0,
      avg_delivery_time: 40,
      accepted_payments: ['pix', 'dinheiro', 'credito', 'debito'],
      gallery_urls: [],
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        logo_url: profile.logo_url || null,
        hero_banner_url: profile.hero_banner_url || null,
        description: profile.description || '',
        instagram: profile.instagram || '',
        facebook: profile.facebook || '',
        whatsapp: profile.whatsapp || '',
        phone: profile.phone || '',
        address: profile.address || '',
        min_order: profile.min_order || 0,
        avg_delivery_time: profile.avg_delivery_time || 40,
        accepted_payments: profile.accepted_payments || ['pix', 'dinheiro', 'credito', 'debito'],
        gallery_urls: profile.gallery_urls || [],
      });
    }
  }, [profile, form]);

  const onSubmit = async (data: FormData) => {
    const updateData: UpdateProfileData = {
      logo_url: data.logo_url || null,
      hero_banner_url: data.hero_banner_url || null,
      description: data.description || null,
      instagram: data.instagram || null,
      facebook: data.facebook || null,
      whatsapp: data.whatsapp || null,
      phone: data.phone || null,
      address: data.address || null,
      min_order: data.min_order || null,
      avg_delivery_time: data.avg_delivery_time || null,
      accepted_payments: data.accepted_payments,
      gallery_urls: data.gallery_urls,
    };

    await update(updateData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Logo and Banner */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Image className="w-4 h-4" />
              Logo e Banner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="logo_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo</FormLabel>
                    <FormControl>
                      <ImageUploader
                        imageUrl={field.value}
                        onImageChange={field.onChange}
                        uploadImage={uploadImage}
                        label="Logo"
                        path="logo"
                        aspectRatio={1}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hero_banner_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banner</FormLabel>
                    <FormControl>
                      <ImageUploader
                        imageUrl={field.value}
                        onImageChange={field.onChange}
                        uploadImage={uploadImage}
                        label="Banner"
                        path="banner"
                        aspectRatio={16 / 9}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Header Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="w-4 h-4" />
              Informações do Restaurante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              {form.watch('logo_url') && (
                <img
                  src={form.watch('logo_url')!}
                  alt={profile?.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
              <div>
                <p className="font-semibold">{profile?.name}</p>
                <p className="text-sm text-muted-foreground">/{profile?.slug}</p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Conte um pouco sobre seu restaurante..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Rua, número - Bairro"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Instagram className="w-4 h-4" />
              Redes Sociais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="@seurestaurante"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="facebook"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="facebook.com/..."
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="73999999999"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="7333333333"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Gallery */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Galeria de Fotos</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="gallery_urls"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <GalleryUploader
                      images={field.value}
                      onImagesChange={field.onChange}
                      uploadImage={uploadImage}
                      maxImages={6}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Delivery Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configurações de Entrega</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pedido Mínimo (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="avg_delivery_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo de Entrega (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="180"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <FormField
              control={form.control}
              name="accepted_payments"
              render={() => (
                <FormItem>
                  <FormLabel>Formas de Pagamento Aceitas</FormLabel>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {PAYMENT_OPTIONS.map((option) => (
                      <FormField
                        key={option.id}
                        control={form.control}
                        name="accepted_payments"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(option.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, option.id]);
                                  } else {
                                    field.onChange(
                                      field.value?.filter((v) => v !== option.id)
                                    );
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {option.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <Button type="submit" className="w-full gap-2" disabled={isUpdating}>
          {isUpdating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar Alterações
        </Button>
      </form>
    </Form>
  );
}
