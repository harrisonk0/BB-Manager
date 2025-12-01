// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Fetch all users from Auth (paginated)
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (authError) throw authError

    // 2. Fetch all user IDs from public.user_roles
    const { data: roles, error: rolesError } = await supabaseAdmin.from('user_roles').select('id')
    if (rolesError) throw rolesError

    const roleIds = new Set(roles.map((r: any) => r.id))
    const zombieUsers = users.filter((u: any) => !roleIds.has(u.id))

    const results = []

    // 3. Fix zombies
    for (const user of zombieUsers) {
        const { error } = await supabaseAdmin.from('user_roles').insert({
            id: user.id,
            email: user.email,
            role: 'pending',
            sections: []
        })
        if (error) {
            results.push({ email: user.email, status: 'failed', error: error.message })
        } else {
            results.push({ email: user.email, status: 'fixed' })
        }
    }

    return new Response(JSON.stringify({ 
        message: `Processed ${users.length} users. Found ${zombieUsers.length} zombies.`,
        results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})