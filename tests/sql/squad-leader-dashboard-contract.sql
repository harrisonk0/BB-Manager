-- Run as database owner. All fixtures and permission changes roll back.
BEGIN;
CREATE TEMP TABLE squad_dashboard_fixture AS SELECT
 gen_random_uuid() AS staff_user,gen_random_uuid() AS leader_user,
 gen_random_uuid() AS boy_user,gen_random_uuid() AS pending_user,
 gen_random_uuid() AS leader_id,gen_random_uuid() AS boy_id,
 gen_random_uuid() AS pending_id,gen_random_uuid() AS mate_id,
 gen_random_uuid() AS other_id,gen_random_uuid() AS junior_id;
GRANT SELECT ON squad_dashboard_fixture TO authenticated;
INSERT INTO auth.users(id,email,email_confirmed_at,aud,role)
 SELECT staff_user,'squad-check-'||staff_user||'@bb-manager.invalid',now(),'authenticated','authenticated' FROM squad_dashboard_fixture
 UNION ALL SELECT leader_user,'squad-check-'||leader_user||'@bb-manager.invalid',now(),'authenticated','authenticated' FROM squad_dashboard_fixture
 UNION ALL SELECT boy_user,'squad-check-'||boy_user||'@bb-manager.invalid',now(),'authenticated','authenticated' FROM squad_dashboard_fixture
 UNION ALL SELECT pending_user,'squad-check-'||pending_user||'@bb-manager.invalid',now(),'authenticated','authenticated' FROM squad_dashboard_fixture;
UPDATE public.profiles SET role='officer' WHERE id=(SELECT staff_user FROM squad_dashboard_fixture);
INSERT INTO public.members(id,name,section,squad,school_year,is_squad_leader)
 SELECT leader_id,'SQUAD SQL Leader','company'::public.section,1,'10',true FROM squad_dashboard_fixture
 UNION ALL SELECT boy_id,'SQUAD SQL Boy','company'::public.section,1,'10',false FROM squad_dashboard_fixture
 UNION ALL SELECT pending_id,'SQUAD SQL Pending','company'::public.section,1,'10',true FROM squad_dashboard_fixture
 UNION ALL SELECT mate_id,'SQUAD SQL Mate','company'::public.section,1,'10',false FROM squad_dashboard_fixture
 UNION ALL SELECT other_id,'SQUAD SQL Other','company'::public.section,2,'10',false FROM squad_dashboard_fixture
 UNION ALL SELECT junior_id,'SQUAD SQL Junior','junior'::public.section,1,'5',false FROM squad_dashboard_fixture;
INSERT INTO public.portal_accounts(member_id,user_id,username,activated_at)
 SELECT leader_id,leader_user,'check.'||replace(leader_id::text,'-',''),now() FROM squad_dashboard_fixture
 UNION ALL SELECT boy_id,boy_user,'check.'||replace(boy_id::text,'-',''),now() FROM squad_dashboard_fixture
 UNION ALL SELECT pending_id,pending_user,'check.'||replace(pending_id::text,'-',''),NULL FROM squad_dashboard_fixture;
INSERT INTO public.marks(member_id,section,date,present,score,created_by)
 SELECT leader_id,'company'::public.section,'2026-10-01'::date,true,0,staff_user FROM squad_dashboard_fixture
 UNION ALL SELECT mate_id,'company'::public.section,'2026-10-01'::date,true,5,staff_user FROM squad_dashboard_fixture
 UNION ALL SELECT mate_id,'company'::public.section,'2026-10-08'::date,false,NULL,staff_user FROM squad_dashboard_fixture
 UNION ALL SELECT mate_id,'company'::public.section,'2026-10-15'::date,true,NULL,staff_user FROM squad_dashboard_fixture
 UNION ALL SELECT other_id,'company'::public.section,'2026-10-01'::date,true,7,staff_user FROM squad_dashboard_fixture
 UNION ALL SELECT junior_id,'junior'::public.section,'2026-10-01'::date,true,6,staff_user FROM squad_dashboard_fixture;
CREATE TEMP TABLE expected_squad_members AS SELECT id FROM public.members WHERE section='company' AND squad=1;
GRANT SELECT ON expected_squad_members TO authenticated;

SELECT set_config('request.jwt.claim.sub',(SELECT boy_user::text FROM squad_dashboard_fixture),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE s jsonb;
BEGIN
 s=public.company_portal_summary();
 IF (s->>'isSquadLeader')::boolean OR s->'squadMembers' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'Ordinary boy received leader statistics'; END IF;
 IF EXISTS(SELECT 1 FROM public.members) OR EXISTS(SELECT 1 FROM public.marks) THEN RAISE EXCEPTION 'Ordinary boy received table access'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT leader_user::text FROM squad_dashboard_fixture),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE s jsonb; mate jsonb; boy jsonb;
BEGIN
 s=public.company_portal_summary();
 IF NOT (s->>'isSquadLeader')::boolean OR jsonb_typeof(s->'squadMembers')<>'array' THEN RAISE EXCEPTION 'Leader statistics missing'; END IF;
 IF jsonb_array_length(s->'squadMembers')<>(SELECT count(*) FROM expected_squad_members) THEN RAISE EXCEPTION 'Wrong squad roster size'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(s->'squadMembers') m WHERE NOT EXISTS(SELECT 1 FROM expected_squad_members e WHERE e.id=(m->>'id')::uuid)) THEN RAISE EXCEPTION 'Other squad/section leaked'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(s->'squadMembers') m WHERE m - 'id' - 'name' - 'isSquadLeader' - 'marks' - 'memberRank' <> '{}'::jsonb) THEN RAISE EXCEPTION 'Unnecessary member fields exposed'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(s->'squadMembers') m CROSS JOIN LATERAL jsonb_array_elements(m->'marks') mk WHERE mk - 'date' - 'score' <> '{}'::jsonb) THEN RAISE EXCEPTION 'Unnecessary mark fields exposed'; END IF;
 SELECT m INTO mate FROM jsonb_array_elements(s->'squadMembers') m WHERE m->>'id'=(SELECT mate_id::text FROM squad_dashboard_fixture);
 IF mate->'marks' <> '[{"date":"2026-10-15","score":0},{"date":"2026-10-08","score":-1},{"date":"2026-10-01","score":5}]'::jsonb THEN RAISE EXCEPTION 'Weekly marks or attendance wrong'; END IF;
 SELECT m INTO boy FROM jsonb_array_elements(s->'squadMembers') m WHERE m->>'id'=(SELECT boy_id::text FROM squad_dashboard_fixture);
 IF boy->'marks'<>'[]'::jsonb THEN RAISE EXCEPTION 'Unrecorded boy received invented marks'; END IF;
 IF public.is_portal_staff() OR EXISTS(SELECT 1 FROM public.members) OR EXISTS(SELECT 1 FROM public.marks) THEN RAISE EXCEPTION 'Leader gained staff/table access'; END IF;
 BEGIN
  PERFORM public.save_company_event(NULL,0,'Forbidden','2029-10-01T19:00','2029-10-01T21:00','','',false);
  RAISE EXCEPTION 'Leader could write staff events';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Staff access required' THEN RAISE; END IF; END;
END $$;
RESET ROLE;

-- Demotion must remove individual statistics without changing the portal identity.
UPDATE public.members SET is_squad_leader=false WHERE id=(SELECT leader_id FROM squad_dashboard_fixture);
SELECT set_config('request.jwt.claim.sub',(SELECT leader_user::text FROM squad_dashboard_fixture),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE s jsonb;
BEGIN
 s=public.company_portal_summary();
 IF (s->>'isSquadLeader')::boolean OR s->'squadMembers' IS DISTINCT FROM 'null'::jsonb THEN RAISE EXCEPTION 'Demoted leader retained statistics'; END IF;
END $$;
RESET ROLE;

-- Transfer follows the current squad, never a caller-supplied squad ID.
UPDATE public.members SET is_squad_leader=true,squad=2 WHERE id=(SELECT leader_id FROM squad_dashboard_fixture);
SELECT set_config('request.jwt.claim.sub',(SELECT leader_user::text FROM squad_dashboard_fixture),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE s jsonb;
BEGIN
 s=public.company_portal_summary();
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s->'squadMembers') m WHERE m->>'id'=(SELECT other_id::text FROM squad_dashboard_fixture)) THEN RAISE EXCEPTION 'New squad missing after transfer'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(s->'squadMembers') m WHERE m->>'id' IN (SELECT mate_id::text FROM squad_dashboard_fixture UNION ALL SELECT boy_id::text FROM squad_dashboard_fixture UNION ALL SELECT junior_id::text FROM squad_dashboard_fixture)) THEN RAISE EXCEPTION 'Old squad/Junior retained after transfer'; END IF;
END $$;
RESET ROLE;

-- Leader status alone cannot bypass incomplete portal setup.
SELECT set_config('request.jwt.claim.sub',(SELECT pending_user::text FROM squad_dashboard_fixture),true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.company_portal_summary(); RAISE EXCEPTION 'Pending leader received statistics';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Portal access required' THEN RAISE; END IF; END;
END $$;
RESET ROLE;

-- Roster deletion revokes the summary as well as the ordinary portal.
DELETE FROM public.members WHERE id=(SELECT leader_id FROM squad_dashboard_fixture);
SELECT set_config('request.jwt.claim.sub',(SELECT leader_user::text FROM squad_dashboard_fixture),true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.company_portal_summary(); RAISE EXCEPTION 'Deleted leader retained statistics';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'Portal access required' THEN RAISE; END IF; END;
 IF has_function_privilege('anon','public.company_portal_summary()','EXECUTE') THEN RAISE EXCEPTION 'Anonymous summary execution allowed'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
