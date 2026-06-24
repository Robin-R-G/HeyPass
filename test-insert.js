const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Manually parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2 && !line.trim().startsWith('#')) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function run() {
  const testName = 'Test Client ' + Date.now();
  const testSlug = 'test-client-' + Date.now();

  // Fetch an existing user first
  console.log('Fetching a valid user...');
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .limit(1)
    .single();

  if (userError) {
    console.error('Error fetching user:', userError);
    return;
  }
  console.log('Using user:', user.email, 'with ID:', user.id);

  console.log('Inserting client...');
  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .insert({ name: testName, slug: testSlug })
    .select()
    .single();

  if (clientError) {
    console.error('Error inserting client:', clientError);
    return;
  }
  console.log('Successfully inserted client:', client);

  console.log('Inserting client membership...');
  const { data: ownerRole } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('client_id', client.id)
    .eq('slug', 'owner')
    .single();

  const { data: membership, error: memberError } = await supabaseAdmin
    .from('client_memberships')
    .insert({
      client_id: client.id,
      user_id: user.id,
      role_id: ownerRole?.id || null,
      status: 'active',
      joined_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (memberError) {
    console.error('Error inserting membership:', memberError);
    console.log('Cleaning up inserted client...');
    await supabaseAdmin.from('clients').delete().eq('id', client.id);
    return;
  }

  console.log('Successfully inserted membership:', membership);

  // Clean up
  console.log('Cleaning up test data...');
  await supabaseAdmin.from('client_memberships').delete().eq('id', membership.id);
  await supabaseAdmin.from('clients').delete().eq('id', client.id);
  console.log('Cleanup complete!');
}

run();
