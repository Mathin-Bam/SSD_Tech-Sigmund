import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, fullName, role } = await req.json();

    if (!email || !fullName || !role) {
      throw new Error('Missing required fields: email, fullName, role');
    }

    // 1. Invite User
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName }
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // 2. Upgrade Profile to Admin
    // (The db trigger already created the profile with 'executive' role)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId);
      
    if (profileError) {
      console.error("Error upgrading profile:", profileError);
      throw profileError;
    }

    // 3. Insert into Team Members
    const { error: teamError } = await supabase
      .from('team_members')
      .insert({
        user_id: userId,
        full_name: fullName,
        role: role,
        department: 'Engineering',
        availability: 'Available',
        active: true
      });

    if (teamError) {
      console.error("Error inserting team member:", teamError);
      throw teamError;
    }

    return new Response(JSON.stringify({ success: true, user: authData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
