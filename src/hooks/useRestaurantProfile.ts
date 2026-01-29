import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface RestaurantProfile {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  hero_banner_url: string | null;
  gallery_urls: string[];
  accepted_payments: string[];
  min_order: number | null;
  avg_delivery_time: number | null;
}

export interface UpdateProfileData {
  description?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
  hero_banner_url?: string | null;
  gallery_urls?: string[];
  accepted_payments?: string[];
  min_order?: number | null;
  avg_delivery_time?: number | null;
}

export function useRestaurantProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['restaurant-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get the restaurant_id from user_roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('restaurant_id')
        .eq('user_id', user.id)
        .single();

      if (roleError || !roleData?.restaurant_id) {
        throw new Error('Restaurante não encontrado para este usuário');
      }

      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, slug, description, instagram, facebook, whatsapp, phone, address, logo_url, hero_banner_url, gallery_urls, accepted_payments, min_order, avg_delivery_time')
        .eq('id', roleData.restaurant_id)
        .single();

      if (error) throw error;

      return {
        ...data,
        gallery_urls: data.gallery_urls || [],
        accepted_payments: data.accepted_payments || ['pix', 'dinheiro', 'credito', 'debito'],
      } as RestaurantProfile;
    },
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updateData: UpdateProfileData) => {
      if (!profile?.id) throw new Error('Perfil não encontrado');

      const { error } = await supabase
        .from('restaurants')
        .update(updateData)
        .eq('id', profile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-profile'] });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil');
    },
  });

  const uploadImage = async (file: File, path: string): Promise<string> => {
    if (!profile?.id) throw new Error('Perfil não encontrado');

    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.id}/${path}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('restaurants')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('restaurants')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  return {
    profile,
    isLoading,
    error,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    uploadImage,
  };
}
