
-- Function to encrypt payment tokens using pgcrypto
CREATE OR REPLACE FUNCTION public.encrypt_payment_token(p_token text, p_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(p_token, p_key),
    'base64'
  );
END;
$$;

-- Function to decrypt payment tokens
CREATE OR REPLACE FUNCTION public.decrypt_payment_token(p_encrypted text, p_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(p_encrypted, 'base64'),
    p_key
  );
END;
$$;
