/**
 * Test script to diagnose real Supabase Cloud connection and schema state
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env directly
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx > -1) {
      envVars[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
}

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

console.log('Testing connection to:', supabaseUrl);
console.log('Key type:', supabaseAnonKey?.startsWith('sb_publishable_') ? 'Publishable Key' : 'JWT Anon Key');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCloud() {
  console.log('\n--- 1. Testing Database Tables ---');
  const tables = [
    'profiles',
    'workspaces',
    'workspace_members',
    'clients',
    'templates',
    'template_items',
    'requests',
    'request_items',
    'documents',
    'reminders',
    'notifications',
    'subscriptions',
    'audit_logs',
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      if (error) {
        console.log(`  ❌ Table '${table}': Error - ${error.code} | ${error.message}`);
      } else {
        console.log(`  ✅ Table '${table}': Exists (Query OK, rows: ${data?.length})`);
      }
    } catch (err: any) {
      console.log(`  ❌ Table '${table}': Exception - ${err.message}`);
    }
  }

  console.log('\n--- 2. Testing RPC Functions ---');
  try {
    const { data, error } = await supabase.rpc('get_client_request_by_token', {
      p_token_hash: '0000000000000000000000000000000000000000000000000000000000000000',
    });
    if (error) {
      console.log(`  ❌ RPC 'get_client_request_by_token': Error - ${error.code} | ${error.message}`);
    } else {
      console.log(`  ✅ RPC 'get_client_request_by_token': Exists (Result: ${JSON.stringify(data)})`);
    }
  } catch (err: any) {
    console.log(`  ❌ RPC 'get_client_request_by_token': Exception - ${err.message}`);
  }

  try {
    const { data, error } = await supabase.rpc('authorize_client_upload', {
      p_token_hash: '0000000000000000000000000000000000000000000000000000000000000000',
      p_request_item_id: '00000000-0000-0000-0000-000000000000',
    });
    if (error) {
      console.log(`  ❌ RPC 'authorize_client_upload': Error - ${error.code} | ${error.message}`);
    } else {
      console.log(`  ✅ RPC 'authorize_client_upload': Exists (Result: ${JSON.stringify(data)})`);
    }
  } catch (err: any) {
    console.log(`  ❌ RPC 'authorize_client_upload': Exception - ${err.message}`);
  }

  console.log('\n--- 3. Testing Storage Buckets ---');
  try {
    const { data: buckets, error: bError } = await supabase.storage.listBuckets();
    if (bError) {
      console.log(`  ❌ listBuckets: ${bError.message}`);
    } else {
      console.log(`  ✅ Buckets found:`, buckets?.map((b) => ({ name: b.name, public: b.public })));
    }
  } catch (err: any) {
    console.log(`  ❌ listBuckets exception: ${err.message}`);
  }
}

checkCloud().catch(console.error);
