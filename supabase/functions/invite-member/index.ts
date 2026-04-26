import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_ROLES = ['admin', 'executive'] as const;
type AllowedRole = typeof ALLOWED_ROLES[number];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ── 1. Authenticate the caller ────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const callerToken = authHeader.replace('Bearer ', '');

    // Use the anon client to verify the caller's identity
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${callerToken}` } },
    });

    const { data: { user: callerUser }, error: callerError } = await anonClient.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid session' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Verify the caller has admin privileges in the profiles table
    const { data: callerProfile, error: profileLookupError } = await anonClient
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single();

    if (profileLookupError || !callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: only admins can invite members' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // ── 2. Parse & validate the request body ─────────────────────────────────
    const body = await req.json();
    const { email, fullName, portalRole, jobTitle, role } = body as {
      email?: string;
      fullName?: string;
      portalRole?: string;
      jobTitle?: string;
      role?: string;
    };

    const portal = (portalRole ?? role)?.trim();
    if (!email || !fullName || !portal) {
      throw new Error('Missing required fields: email, fullName, portalRole (or legacy role)');
    }

    if (!ALLOWED_ROLES.includes(portal as AllowedRole)) {
      return new Response(
        JSON.stringify({
          error: `Invalid portal role "${portal}". Must be one of: ${ALLOWED_ROLES.join(', ')}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }
    const validatedPortal = portal as AllowedRole;
    const teamMemberRole =
      typeof jobTitle === 'string' && jobTitle.trim().length > 0 ? jobTitle.trim() : 'Team Member';

    // ── 3. Privileged operations via service-role client ─────────────────────
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Invite the user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName }
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // ── 4. Update profile role (dashboard access: admin | executive) ─────────
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: validatedPortal })
      .eq('id', userId);

    if (profileError) {
      console.error('Error updating profile role, rolling back auth user:', profileError);
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Profile update failed: ${profileError.message}`);
    }

    // ── 5. Insert into team_members (upsert to tolerate retries) ─────────────
    const { error: teamError } = await supabase
      .from('team_members')
      .upsert(
        {
          user_id: userId,
          full_name: fullName,
          role: teamMemberRole,
          department: 'Engineering',
          availability: 'Available',
          active: true,
        },
        { onConflict: 'user_id' }
      );

    if (teamError) {
      console.error('Error inserting team member, rolling back auth user and profile:', teamError);
      // Revert profile role change
      await supabase.from('profiles').update({ role: 'executive' }).eq('id', userId);
      // Delete the auth user so a retry with the same email won't hit a conflict
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Team member insert failed: ${teamError.message}`);
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
