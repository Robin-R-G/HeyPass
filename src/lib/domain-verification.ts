import { supabaseAdmin } from '@/lib/supabase/client';
import { cacheGet, cacheSet, cacheDelete, checkRateLimit } from '@/lib/cache';
import { createAuditLog } from '@/lib/audit';
import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);
const resolveCname = promisify(dns.resolveCname);
const resolve4 = promisify(dns.resolve4);

// ============================================================
// TYPES
// ============================================================

export interface DomainRecord {
  id: string;
  client_id: string;
  domain: string;
  verified: boolean;
  verification_token: string;
  verification_method: 'cname' | 'txt';
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DomainVerificationResult {
  verified: boolean;
  method: 'cname' | 'txt';
  records: string[];
  error?: string;
}

// ============================================================
// VALIDATION
// ============================================================

const BLOCKED_DOMAINS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'heypass.app',
  'heypass.io',
  '*.heypass.app',
  '*.heypass.io',
  'localhost.localdomain',
  'invalid',
  'internal',
  'local',
  'example.com',
  'example.org',
  'example.net',
]);

function validateDomain(domain: string): { valid: boolean; error?: string } {
  // Normalize
  domain = domain.toLowerCase().trim();

  // Remove protocol
  if (domain.startsWith('http://')) domain = domain.slice(7);
  if (domain.startsWith('https://')) domain = domain.slice(8);

  // Remove trailing slash
  domain = domain.replace(/\/$/, '');

  // Remove port
  domain = domain.replace(/:\d+$/, '');

  // Validate format
  const domainRegex = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
  if (!domainRegex.test(domain)) {
    return { valid: false, error: 'Invalid domain format' };
  }

  // Check length
  if (domain.length > 253) {
    return { valid: false, error: 'Domain too long (max 253 characters)' };
  }

  // Check blocked domains
  if (BLOCKED_DOMAINS.has(domain)) {
    return { valid: false, error: 'This domain cannot be used' };
  }

  // Check blocked patterns
  if (domain.endsWith('.heypass.app') || domain.endsWith('.heypass.io')) {
    return { valid: false, error: 'Subdomains of HeyPass are not allowed' };
  }

  return { valid: true, error: undefined };
}

// ============================================================
// TOKEN GENERATION
// ============================================================

function generateVerificationToken(): string {
  return `heypass-verify-${Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`;
}

// ============================================================
// DOMAIN CRUD
// ============================================================

export async function listDomains(clientId: string): Promise<DomainRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('client_domains')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addDomain(
  clientId: string,
  userId: string,
  domain: string
): Promise<DomainRecord> {
  // Rate limit: 5 domains per hour
  const rateLimitKey = `domain:add:${clientId}`;
  const { allowed } = await checkRateLimit(rateLimitKey, 5, 3600);
  if (!allowed) {
    throw new Error('Too many domain additions. Please try again later.');
  }

  // Validate domain
  const validation = validateDomain(domain);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Check if domain already exists
  const { data: existing } = await supabaseAdmin
    .from('client_domains')
    .select('id, client_id')
    .eq('domain', domain)
    .single();

  if (existing) {
    if (existing.client_id === clientId) {
      throw new Error('Domain already added to this account');
    }
    throw new Error('Domain is already registered to another account');
  }

  // Check clients.custom_domain
  const { data: clientWithDomain } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('custom_domain', domain)
    .single();

  if (clientWithDomain && clientWithDomain.id !== clientId) {
    throw new Error('Domain is already registered to another account');
  }

  // Generate verification token
  const verificationToken = generateVerificationToken();

  // Add domain
  const { data, error } = await supabaseAdmin
    .from('client_domains')
    .insert({
      client_id: clientId,
      domain,
      verified: false,
      verification_token: verificationToken,
      verification_method: 'txt',
    })
    .select()
    .single();

  if (error) throw error;

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'settings.update',
    resource_type: 'domain',
    resource_id: data.id,
    new_value: { domain, action: 'added' },
  });

  return data;
}

export async function removeDomain(
  clientId: string,
  userId: string,
  domainId: string
): Promise<void> {
  const { data: domain, error } = await supabaseAdmin
    .from('client_domains')
    .delete()
    .eq('id', domainId)
    .eq('client_id', clientId)
    .select()
    .single();

  if (error || !domain) {
    throw new Error('Domain not found');
  }

  await cacheDelete(`domain-branding:${domain.domain}`);

  await createAuditLog({
    user_id: userId,
    client_id: clientId,
    action: 'settings.update',
    resource_type: 'domain',
    resource_id: domainId,
    new_value: { domain: domain.domain, action: 'removed' },
  });
}

// ============================================================
// DOMAIN VERIFICATION
// ============================================================

export async function verifyDomain(
  clientId: string,
  userId: string,
  domainId: string
): Promise<DomainVerificationResult> {
  // Rate limit: 10 verifications per hour
  const rateLimitKey = `domain:verify:${clientId}`;
  const { allowed } = await checkRateLimit(rateLimitKey, 10, 3600);
  if (!allowed) {
    throw new Error('Too many verification attempts. Please try again later.');
  }

  // Get domain record
  const { data: domain, error } = await supabaseAdmin
    .from('client_domains')
    .select('*')
    .eq('id', domainId)
    .eq('client_id', clientId)
    .single();

  if (error || !domain) {
    throw new Error('Domain not found');
  }

  let result: DomainVerificationResult;

  try {
    // Try TXT record verification first
    const txtRecords = await verifyTxtRecord(domain.domain, domain.verification_token);
    if (txtRecords.verified) {
      result = { verified: true, method: 'txt', records: txtRecords.records };
    } else {
      // Try CNAME verification
      const cnameRecords = await verifyCnameRecord(domain.domain, domain.verification_token);
      if (cnameRecords.verified) {
        result = { verified: true, method: 'cname', records: cnameRecords.records };
      } else {
        result = {
          verified: false,
          method: domain.verification_method || 'txt',
          records: [],
          error: 'DNS records not found. Please check your DNS configuration.',
        };
      }
    }
  } catch (err) {
    result = {
      verified: false,
      method: domain.verification_method || 'txt',
      records: [],
      error: 'DNS lookup failed. Please try again later.',
    };
  }

  // Update verification status
  await supabaseAdmin
    .from('client_domains')
    .update({
      verified: result.verified,
      verification_method: result.method,
      last_verified_at: result.verified ? new Date().toISOString() : null,
    })
    .eq('id', domainId);

  if (result.verified) {
    await cacheDelete(`domain-branding:${domain.domain}`);

    await createAuditLog({
      user_id: userId,
      client_id: clientId,
      action: 'settings.update',
      resource_type: 'domain',
      resource_id: domainId,
      new_value: { domain: domain.domain, verified: true, method: result.method },
    });
  }

  return result;
}

async function verifyTxtRecord(
  domain: string,
  expectedToken: string
): Promise<{ verified: boolean; records: string[] }> {
  try {
    const records = await resolveTxt(domain);
    const flatRecords = records.map((r) => r.join(''));
    const verified = flatRecords.some((r) => r.includes(expectedToken));
    return { verified, records: flatRecords };
  } catch {
    return { verified: false, records: [] };
  }
}

async function verifyCnameRecord(
  domain: string,
  expectedToken: string
): Promise<{ verified: boolean; records: string[] }> {
  try {
    const records = await resolveCname(domain);
    const verified = records.some((r) => r.includes(expectedToken));
    return { verified, records };
  } catch {
    return { verified: false, records: [] };
  }
}

// ============================================================
// DNS RECORDS INFO
// ============================================================

export async function getDnsInstructions(
  clientId: string,
  domainId: string
): Promise<{
  domain: string;
  method: string;
  records: Array<{ type: string; name: string; value: string; ttl: number }>;
}> {
  const { data: domain } = await supabaseAdmin
    .from('client_domains')
    .select('*')
    .eq('id', domainId)
    .eq('client_id', clientId)
    .single();

  if (!domain) {
    throw new Error('Domain not found');
  }

  const records = [
    {
      type: 'TXT',
      name: domain.domain,
      value: domain.verification_token,
      ttl: 300,
    },
    {
      type: 'CNAME',
      name: domain.domain,
      value: 'heypass.app',
      ttl: 300,
    },
  ];

  return {
    domain: domain.domain,
    method: domain.verification_method || 'txt',
    records,
  };
}

// ============================================================
// HELPER: Check if domain is verified for client
// ============================================================

export async function isDomainVerified(domain: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('client_domains')
    .select('client_id')
    .eq('domain', domain)
    .eq('verified', true)
    .single();

  return data?.client_id || null;
}
