import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    // Create a Supabase client with the SERVICE ROLE key to perform admin actions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Verify the requester's identity
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestUser }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !requestUser) {
      throw new Error('Invalid token')
    }

    // 2. Check the requester's role in the database
    // Only Admins and Captains can delete users
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

    // 3. Get the UID to delete from the request body
    const { uid } = await req.json()
    if (!uid) throw new Error('Missing uid to delete')

    // 4. Perform the deletion from Supabase Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(uid)
    
    if (deleteError) throw deleteError

    // 5. Also ensure their role entry is deleted (cleanup)
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