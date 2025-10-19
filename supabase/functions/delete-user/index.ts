import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const isDeletingOwnAccount = user.id === userId;
    let isAdmin = false;

    if (!isDeletingOwnAccount) {
      const { data: adminCheck } = await supabaseClient
        .from('user_subscriptions')
        .select('subscription_tier')
        .eq('user_id', user.id)
        .maybeSingle();

      isAdmin = adminCheck?.subscription_tier === 'admin';

      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: 'You can only delete your own account or you need admin privileges' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    await supabaseAdmin
      .from('watchlist')
      .delete()
      .eq('user_id', userId);

    const { data: portfolios } = await supabaseAdmin
      .from('portfolios')
      .select('id')
      .eq('user_id', userId);

    if (portfolios && portfolios.length > 0) {
      const portfolioIds = portfolios.map((p: any) => p.id);

      await supabaseAdmin
        .from('portfolio_holdings')
        .delete()
        .in('portfolio_id', portfolioIds);

      await supabaseAdmin
        .from('transactions')
        .delete()
        .in('portfolio_id', portfolioIds);

      await supabaseAdmin
        .from('portfolios')
        .delete()
        .eq('user_id', userId);
    }

    await supabaseAdmin
      .from('admin_notes')
      .delete()
      .eq('user_id', userId);

    await supabaseAdmin
      .from('user_activity_logs')
      .delete()
      .eq('user_id', userId);

    await supabaseAdmin
      .from('user_preferences')
      .delete()
      .eq('user_id', userId);

    await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    await supabaseAdmin
      .from('user_subscriptions')
      .delete()
      .eq('user_id', userId);

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting auth user:', authError);
      return new Response(
        JSON.stringify({ error: `Failed to delete auth user: ${authError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in delete-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});