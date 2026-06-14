CREATE OR REPLACE FUNCTION public.call_next_token()
RETURNS public.tokens
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  next_token public.tokens;
  current_id uuid;
BEGIN
  SELECT current_token_id INTO current_id FROM public.clinic_state WHERE id = 1 FOR UPDATE;
  IF current_id IS NOT NULL THEN
    UPDATE public.tokens SET status = 'done', completed_at = now()
      WHERE id = current_id AND status = 'serving';
  END IF;
  SELECT * INTO next_token FROM public.tokens
    WHERE status = 'waiting' AND created_at::date = CURRENT_DATE
    ORDER BY priority DESC, created_at ASC
    LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF next_token.id IS NULL THEN
    UPDATE public.clinic_state SET current_token_id = NULL, updated_at = now() WHERE id = 1;
    RETURN NULL;
  END IF;
  UPDATE public.tokens SET status = 'serving', called_at = now()
    WHERE id = next_token.id RETURNING * INTO next_token;
  UPDATE public.clinic_state SET current_token_id = next_token.id, updated_at = now() WHERE id = 1;
  RETURN next_token;
END $$;