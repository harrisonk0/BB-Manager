-- Section squad lists live on the seeded settings rows.
-- Importing a boy from a closed session records which archived member they came from.
-- Apply against the hosted project; do not assume a local stack exists.

CREATE OR REPLACE FUNCTION public.squads_payload_is_valid(payload jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  item jsonb;
  seen int[] := ARRAY[]::int[];
  n int;
  lbl text;
BEGIN
  IF payload IS NULL OR jsonb_typeof(payload) <> 'array' THEN
    RETURN false;
  END IF;

  IF jsonb_array_length(payload) < 1 OR jsonb_array_length(payload) > 20 THEN
    RETURN false;
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(payload)
  LOOP
    IF jsonb_typeof(item) <> 'object' THEN
      RETURN false;
    END IF;

    IF jsonb_typeof(item -> 'number') <> 'number' THEN
      RETURN false;
    END IF;

    IF (item ->> 'number') !~ '^[0-9]+$' THEN
      RETURN false;
    END IF;

    n := (item ->> 'number')::int;
    IF n < 1 OR n > 99 THEN
      RETURN false;
    END IF;

    IF n = ANY (seen) THEN
      RETURN false;
    END IF;
    seen := array_append(seen, n);

    IF item ? 'label' AND jsonb_typeof(item -> 'label') IS DISTINCT FROM 'null' THEN
      IF jsonb_typeof(item -> 'label') <> 'string' THEN
        RETURN false;
      END IF;
      lbl := btrim(item ->> 'label');
      IF char_length(lbl) > 40 THEN
        RETURN false;
      END IF;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS squads jsonb;

UPDATE public.settings
SET squads = '[
  {"number": 1, "label": null},
  {"number": 2, "label": null},
  {"number": 3, "label": null}
]'::jsonb
WHERE section = 'company' AND (squads IS NULL OR squads = '[]'::jsonb);

UPDATE public.settings
SET squads = '[
  {"number": 1, "label": null},
  {"number": 2, "label": null},
  {"number": 3, "label": null},
  {"number": 4, "label": null}
]'::jsonb
WHERE section = 'junior' AND (squads IS NULL OR squads = '[]'::jsonb);

ALTER TABLE public.settings
  ALTER COLUMN squads SET DEFAULT '[{"number":1,"label":null}]'::jsonb;

ALTER TABLE public.settings
  ALTER COLUMN squads SET NOT NULL;

ALTER TABLE public.settings
  DROP CONSTRAINT IF EXISTS settings_squads_valid;

ALTER TABLE public.settings
  ADD CONSTRAINT settings_squads_valid CHECK (public.squads_payload_is_valid(squads));

COMMENT ON COLUMN public.settings.squads IS
  'JSON array of {number, label} objects for this section. Labels are optional nicknames.';

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS imported_from_archived_member_id uuid
    REFERENCES public.archived_members (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS members_imported_from_archived_member_id_key
  ON public.members (imported_from_archived_member_id)
  WHERE imported_from_archived_member_id IS NOT NULL;

COMMENT ON COLUMN public.members.imported_from_archived_member_id IS
  'When set, this live member was imported from that archived_members row. Marks are not copied.';

REVOKE ALL ON FUNCTION public.squads_payload_is_valid(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.squads_payload_is_valid(jsonb) TO authenticated, postgres, service_role;
