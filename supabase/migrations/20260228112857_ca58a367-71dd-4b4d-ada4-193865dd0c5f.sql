INSERT INTO public.user_roles (user_id, role)
VALUES ('e7a6285a-7d5c-4bdc-a8f5-021444c106ea', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;