/**
 * Test real Supabase Auth signup and workspace creation
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

async function testAuth() {
  console.log('Testing auth against:', envVars.VITE_SUPABASE_URL);

  const testEmail = `docchase.audit.${Date.now()}@gmail.com`;
  const testPassword = 'TestPassword123!@#Secure';

  console.log('Signing up test user:', testEmail);
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: 'Test Accountant',
      },
    },
  });

  if (error) {
    console.error('❌ Auth sign up error:', error);
    return;
  }

  console.log('✅ Auth sign up OK! User ID:', data.user?.id);
  console.log('Session present:', Boolean(data.session));

  // Now test querying workspaces with this user's token
  if (data.session) {
    const authedClient = createClient(
      envVars.VITE_SUPABASE_URL,
      envVars.VITE_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        },
      }
    );

    const { data: profile, error: pError } = await authedClient
      .from('profiles')
      .select('*')
      .eq('id', data.user!.id)
      .single();

    if (pError) {
      console.log('Profile query error:', pError);
    } else {
      console.log('✅ Profile found:', profile);
    }

    const { data: members, error: mError } = await authedClient
      .from('workspace_members')
      .select('*');

    if (mError) {
      console.log('❌ workspace_members error:', mError);
    } else {
      console.log('✅ workspace_members query OK! Rows:', members?.length);
    }
  }
}

testAuth().catch(console.error);
