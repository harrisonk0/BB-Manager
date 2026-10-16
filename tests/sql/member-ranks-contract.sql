-- Run as database owner after the rank migration. Every fixture rolls back.
BEGIN;
CREATE TEMP TABLE rank_fixture AS SELECT gen_random_uuid() AS staff_user,gen_random_uuid() AS boy_user,
 gen_random_uuid() AS leader_user,gen_random_uuid() AS boy_id,gen_random_uuid() AS leader_id;
GRANT SELECT ON rank_fixture TO authenticated;
INSERT INTO auth.users(id,email,email_confirmed_at,aud,role)
 SELECT staff_user,'rank-check-'||staff_user||'@bb-manager.invalid',now(),'authenticated','authenticated' FROM rank_fixture
 UNION ALL SELECT boy_user,'rank-check-'||boy_user||'@bb-manager.invalid',now(),'authenticated','authenticated' FROM rank_fixture
 UNION ALL SELECT leader_user,'rank-check-'||leader_user||'@bb-manager.invalid',now(),'authenticated','authenticated' FROM rank_fixture;
UPDATE public.profiles SET role='officer' WHERE id=(SELECT staff_user FROM rank_fixture);
INSERT INTO public.members(id,name,section,squad,school_year,is_squad_leader)
 SELECT boy_id,'RANK SQL Boy','company'::public.section,1,'11',false FROM rank_fixture
 UNION ALL SELECT leader_id,'RANK SQL Leader','company'::public.section,1,'14',true FROM rank_fixture;
INSERT INTO public.portal_accounts(member_id,user_id,username,activated_at)
 SELECT boy_id,boy_user,'rank.'||replace(boy_id::text,'-',''),now() FROM rank_fixture
 UNION ALL SELECT leader_id,leader_user,'rank.'||replace(leader_id::text,'-',''),now() FROM rank_fixture;
SELECT set_config('request.jwt.claim.sub',(SELECT staff_user::text FROM rank_fixture),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE v_rank text; v_year text;
BEGIN
 FOREACH v_rank IN ARRAY ARRAY['lance_corporal','corporal','sergeant','staff_sergeant'] LOOP
  FOREACH v_year IN ARRAY ARRAY['11','12','13','14'] LOOP
   UPDATE public.members SET rank=v_rank,school_year=v_year WHERE id=(SELECT boy_id FROM rank_fixture);
   IF NOT EXISTS(SELECT 1 FROM public.members WHERE id=(SELECT boy_id FROM rank_fixture) AND rank=v_rank) THEN RAISE EXCEPTION 'Officer rank save failed'; END IF;
  END LOOP;
 END LOOP;
 BEGIN UPDATE public.members SET rank='captain' WHERE id=(SELECT boy_id FROM rank_fixture); RAISE EXCEPTION 'Invalid rank accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 FOREACH v_year IN ARRAY ARRAY['8','9','10','15','P7'] LOOP
  BEGIN UPDATE public.members SET school_year=v_year WHERE id=(SELECT boy_id FROM rank_fixture); RAISE EXCEPTION 'Ineligible rank/year accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 END LOOP;
 BEGIN UPDATE public.members SET section='junior',school_year='P7' WHERE id=(SELECT boy_id FROM rank_fixture); RAISE EXCEPTION 'Junior rank accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 UPDATE public.members SET rank=NULL,school_year='10' WHERE id=(SELECT boy_id FROM rank_fixture);
 UPDATE public.members SET rank='corporal',school_year='11' WHERE id=(SELECT boy_id FROM rank_fixture);
 UPDATE public.members SET rank='staff_sergeant' WHERE id=(SELECT leader_id FROM rank_fixture);
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT boy_user::text FROM rank_fixture),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE s jsonb; n integer;
BEGIN
 s=public.company_portal_summary();
 IF s->>'memberRank'<>'corporal' OR (s->>'isSquadLeader')::boolean OR s->'squadMembers'<>'null'::jsonb THEN RAISE EXCEPTION 'Rank changed ordinary boy access'; END IF;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s->'teammates') t WHERE t->>'name'='RANK SQL Leader' AND t->>'memberRank'='staff_sergeant') THEN RAISE EXCEPTION 'Teammate rank missing'; END IF;
 UPDATE public.members SET rank='sergeant' WHERE id=(SELECT boy_id FROM rank_fixture);
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'Boy could assign own rank'; END IF;
 IF EXISTS(SELECT 1 FROM public.members) OR public.is_portal_staff() THEN RAISE EXCEPTION 'Rank granted staff access'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',(SELECT leader_user::text FROM rank_fixture),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE s jsonb;
BEGIN
 s=public.company_portal_summary();
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s->'squadMembers') m WHERE m->>'name'='RANK SQL Boy' AND m->>'memberRank'='corporal') THEN RAISE EXCEPTION 'Leader dashboard rank missing'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
