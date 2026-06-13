
CREATE TYPE public.token_status AS ENUM ('waiting','serving','done','skipped');
CREATE TYPE public.token_priority AS ENUM ('normal','emergency');

CREATE TABLE public.tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number int NOT NULL,
  patient_name text NOT NULL,
  status public.token_status NOT NULL DEFAULT 'waiting',
  priority public.token_priority NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_date date GENERATED ALWAYS AS ((created_at AT TIME ZONE 'UTC')::date) STORED,
  called_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX tokens_queue_idx ON public.tokens (status, priority DESC, created_at);
CREATE UNIQUE INDEX tokens_number_today ON public.tokens (number, created_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tokens TO anon, authenticated;
GRANT ALL ON public.tokens TO service_role;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read tokens" ON public.tokens FOR SELECT USING (true);
CREATE POLICY "public insert tokens" ON public.tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "public update tokens" ON public.tokens FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "public delete tokens" ON public.tokens FOR DELETE USING (true);

CREATE TABLE public.clinic_state (
  id int PRIMARY KEY DEFAULT 1,
  avg_consultation_minutes int NOT NULL DEFAULT 10,
  on_break boolean NOT NULL DEFAULT false,
  current_token_id uuid REFERENCES public.tokens(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinic_state_singleton CHECK (id = 1)
);
INSERT INTO public.clinic_state (id) VALUES (1);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_state TO anon, authenticated;
GRANT ALL ON public.clinic_state TO service_role;
ALTER TABLE public.clinic_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read clinic" ON public.clinic_state FOR SELECT USING (true);
CREATE POLICY "public update clinic" ON public.clinic_state FOR UPDATE USING (true) WITH CHECK (true);

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
    WHERE status = 'waiting'
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
GRANT EXECUTE ON FUNCTION public.call_next_token() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.assign_token_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.number IS NULL OR NEW.number = 0 THEN
    SELECT COALESCE(MAX(number),0)+1 INTO NEW.number
      FROM public.tokens WHERE created_at::date = CURRENT_DATE;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_assign_token_number BEFORE INSERT ON public.tokens
  FOR EACH ROW EXECUTE FUNCTION public.assign_token_number();

ALTER PUBLICATION supabase_realtime ADD TABLE public.tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clinic_state;
ALTER TABLE public.tokens REPLICA IDENTITY FULL;
ALTER TABLE public.clinic_state REPLICA IDENTITY FULL;
