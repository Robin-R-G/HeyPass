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
  console.log('Starting EventOS CRM validation...');

  // 1. Verify tables exist
  console.log('Checking if CRM tables exist in database...');
  const { data: tablesCheck, error: tableError } = await supabaseAdmin
    .from('crm_contacts')
    .select('id')
    .limit(1);

  if (tableError) {
    console.error('Table verification failed! Make sure you run the SQL migration 025_crm_contacts_and_whatsapp.sql first on your Supabase SQL editor.');
    console.error('SQL Error details:', tableError);
    return;
  }
  console.log('Success: crm_contacts table detected.');

  // Fetch or create a test client
  const testSlug = 'crm-verify-' + Date.now();
  console.log('Inserting test client...');
  const { data: client } = await supabaseAdmin
    .from('clients')
    .insert({ name: 'Verification Client', slug: testSlug })
    .select()
    .single();

  if (!client) {
    console.error('Failed to create verification client.');
    return;
  }
  console.log('Using client ID:', client.id);

  // Insert a test event
  console.log('Inserting test event...');
  const { data: event } = await supabaseAdmin
    .from('events')
    .insert({
      client_id: client.id,
      title: 'Verification Event',
      slug: 'verify-event-' + Date.now(),
      status: 'draft',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(),
    })
    .select()
    .single();

  if (!event) {
    console.error('Failed to create verification event. Cleaning up client.');
    await supabaseAdmin.from('clients').delete().eq('id', client.id);
    return;
  }
  console.log('Using event ID:', event.id);

  // 2. Test registration sync trigger
  console.log('Simulating new attendee registration (should trigger CRM contact auto-creation)...');
  const regEmail = `attendee-${Date.now()}@example.com`;
  const { data: reg, error: regError } = await supabaseAdmin
    .from('registrations')
    .insert({
      client_id: client.id,
      event_id: event.id,
      first_name: 'John',
      last_name: 'Doe',
      email: regEmail,
      phone: '+919999999999',
      company: 'Test Org',
      job_title: 'Developer',
      source: 'web_verify',
    })
    .select()
    .single();

  if (regError) {
    console.error('Registration insertion failed:', regError);
  } else {
    console.log('Registration successfully inserted with ID:', reg.id);
    console.log('Associated contact ID from trigger:', reg.contact_id);

    if (reg.contact_id) {
      // Fetch contact details to check auto-created details
      const { data: contact } = await supabaseAdmin
        .from('crm_contacts')
        .select('*')
        .eq('id', reg.contact_id)
        .single();
      
      console.log('Auto-created contact details:', {
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        score: contact.engagement_score, // should be 10 points
      });

      if (contact.engagement_score === 10) {
        console.log('Success: Auto-scoring for registration (10 pts) verified.');
      } else {
        console.warn('Warning: Expected score of 10 points on registration, got:', contact.engagement_score);
      }
    }
  }

  // Clean up
  console.log('Cleaning up test data...');
  if (reg) await supabaseAdmin.from('registrations').delete().eq('id', reg.id);
  await supabaseAdmin.from('events').delete().eq('id', event.id);
  await supabaseAdmin.from('clients').delete().eq('id', client.id);
  console.log('Cleanup complete!');
  console.log('CRM validation testing finished.');
}

run().catch(console.error);
