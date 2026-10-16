-- Expose only names and leader flags for the authenticated boy's own squad.
-- Preserve staff-only roster/marks policies and existing RPC grants.
CREATE OR REPLACE FUNCTION public.company_portal_summary() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid; v_result jsonb;
BEGIN
 SELECT a.member_id INTO v_id FROM public.portal_accounts a JOIN public.members m ON m.id=a.member_id
 WHERE a.user_id=auth.uid() AND a.activated_at IS NOT NULL AND m.section='company';
 IF v_id IS NULL THEN RAISE EXCEPTION 'Portal access required'; END IF;
 WITH totals AS (
  SELECT m.id,m.name,m.squad,coalesce(sum(CASE WHEN mk.present THEN coalesce(mk.score,0) ELSE 0 END),0) AS total,
   count(mk.id) FILTER(WHERE mk.present) AS attended,count(mk.id) AS recorded
  FROM public.members m LEFT JOIN public.marks mk ON mk.member_id=m.id AND mk.section='company'
  WHERE m.section='company' GROUP BY m.id,m.name,m.squad
 ), ranked AS (
  SELECT *,rank() OVER(ORDER BY total DESC) AS company_rank,rank() OVER(PARTITION BY squad ORDER BY total DESC) AS squad_rank FROM totals
 ), squads AS (
  SELECT squad,sum(total) AS total,sum(attended) AS attended,sum(recorded) AS recorded FROM totals GROUP BY squad
 )
 SELECT jsonb_build_object('name',r.name,'squad',r.squad,'total',r.total,'attended',r.attended,'recorded',r.recorded,
 'companyRank',r.company_rank,'squadRank',r.squad_rank,
 'marks',coalesce((SELECT jsonb_agg(jsonb_build_object('date',date,'score',CASE WHEN present THEN coalesce(score,0) ELSE -1 END) ORDER BY date DESC)
  FROM public.marks WHERE member_id=v_id AND section='company'),'[]'::jsonb),
 'teammates',coalesce((SELECT jsonb_agg(jsonb_build_object('name',mate.name,'isSquadLeader',mate.is_squad_leader)
  ORDER BY mate.is_squad_leader DESC,lower(mate.name),mate.id)
  FROM public.members mate WHERE mate.section='company' AND mate.squad=r.squad AND mate.id<>v_id),'[]'::jsonb),
 'squads',coalesce((SELECT jsonb_agg(jsonb_build_object('number',sq.squad,'total',sq.total,'attended',sq.attended,'recorded',sq.recorded,
  'label',(SELECT item->>'label' FROM public.settings s,jsonb_array_elements(s.squads) item WHERE s.section='company' AND (item->>'number')::int=sq.squad)) ORDER BY sq.total DESC,sq.squad) FROM squads sq),'[]'::jsonb)) INTO v_result FROM ranked r WHERE r.id=v_id;
 RETURN v_result;
END $$;

