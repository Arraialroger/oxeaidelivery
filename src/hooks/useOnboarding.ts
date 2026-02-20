import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OnboardingData {
  name: string;
  slug: string;
  category: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

const INITIAL_DATA: OnboardingData = {
  name: '',
  slug: '',
  category: 'restaurant',
  logoUrl: null,
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
};

export function useOnboarding() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalSteps = 4;

  const updateData = (partial: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...partial }));
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  };

  const checkSlugAvailability = async (slug: string) => {
    if (slug.length < 3) {
      setSlugAvailable(null);
      return;
    }
    setCheckingSlug(true);
    const { data: existing } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    setSlugAvailable(!existing);
    setCheckingSlug(false);
  };

  const nextStep = () => {
    if (step < totalSteps - 1) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `onboarding/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('restaurants')
      .upload(path, file, { upsert: true });

    if (error) {
      toast({ title: 'Erro ao enviar logo', description: error.message, variant: 'destructive' });
      return null;
    }

    const { data: urlData } = supabase.storage.from('restaurants').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const submit = async () => {
    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast({ title: 'Faça login primeiro', variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/create-restaurant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            name: data.name,
            slug: data.slug,
            category: data.category,
            logo_url: data.logoUrl,
            primary_color: data.primaryColor,
            secondary_color: data.secondaryColor,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      toast({ title: '🎉 Restaurante criado!', description: 'Você será redirecionado para o painel.' });
      navigate(`/${result.restaurant.slug}/admin`);
    } catch (err) {
      console.error('Onboarding error:', err);
      toast({ title: 'Erro inesperado', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    step,
    totalSteps,
    data,
    isSubmitting,
    slugAvailable,
    checkingSlug,
    updateData,
    generateSlug,
    checkSlugAvailability,
    nextStep,
    prevStep,
    uploadLogo,
    submit,
  };
}
