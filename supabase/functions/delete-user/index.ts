// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    // 1. Strict Auth Header Validation
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or malformed Authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestUser }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !requestUser) {
      throw new Error('Invalid authentication token')
    }

    // 2. Authorization Check
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('id', requestUser.id)
      .single()

    if (roleError || !roleData || !['admin', 'captain'].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Input Validation
    const { uid } = await req.json()
    // Strict UUID v4 regex validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uid || !uuidRegex.test(uid)) {
        throw new Error('Invalid or missing UID format');
    }

    // 4. Privilege Escalation Check
    const { data: targetRoleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('id', uid)
      .single()

    if (targetRoleData && targetRoleData.role === 'admin' && roleData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized: Captains cannot delete Administrators' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5. Execution
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(uid)
    if (deleteError) throw deleteError

    await supabaseAdmin.from('user_roles').delete().eq('id', uid)

    return new Response(JSON.stringify({ success: true, message: `User ${uid} deleted` }), {
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