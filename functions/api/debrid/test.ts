export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function onRequestPost(context: any) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const { request } = context;
    const body = await request.json();
    const { apiKey, provider = 'realdebrid' } = body;

    if (!apiKey || !apiKey.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'API token is required' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const cleanKey = apiKey.trim();

    if (provider === 'torbox') {
      const res = await fetch('https://api.torbox.app/v1/api/user/me', {
        headers: { Authorization: `Bearer ${cleanKey}` }
      });
      const data: any = await res.json();
      if (!res.ok || !data.success) {
        return new Response(
          JSON.stringify({ success: false, error: data.detail || data.error || 'Invalid Torbox token' }),
          { status: 200, headers: corsHeaders }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          provider: 'torbox',
          username: data.data?.email || 'Torbox User',
          isPremium: (data.data?.plan || 0) > 0,
          accountType: (data.data?.plan || 0) > 0 ? 'Pro / Premium' : 'Free',
          expiration: data.data?.customer?.subscription?.current_period_end || 'Active'
        }),
        { status: 200, headers: corsHeaders }
      );
    } else {
      // Real-Debrid
      const res = await fetch('https://api.real-debrid.com/rest/1.0/user', {
        headers: { Authorization: `Bearer ${cleanKey}` }
      });
      const data: any = await res.json();

      if (!res.ok || data.error) {
        const msg = data.error === 'bad_token'
          ? 'Invalid Real-Debrid API token. Please get your secret token from https://real-debrid.com/apitoken'
          : (data.error || 'Failed to authenticate with Real-Debrid');
        return new Response(
          JSON.stringify({ success: false, error: msg, raw: data }),
          { status: 200, headers: corsHeaders }
        );
      }

      const isPremium = data.type === 'premium';
      return new Response(
        JSON.stringify({
          success: true,
          provider: 'realdebrid',
          username: data.username,
          email: data.email,
          isPremium,
          accountType: data.type,
          expiration: data.expiration,
          points: data.points
        }),
        { status: 200, headers: corsHeaders }
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Error checking Debrid token' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
