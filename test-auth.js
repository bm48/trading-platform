// Test script to create a Supabase user and test case creation
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'demo@example.com',
      password: 'testpass123',
      email_confirm: true,
      user_metadata: {
        role: 'user'
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return;
    }

    console.log('Created auth user:', authData.user.id);

    // Create profile in users table
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .upsert({
        id: authData.user.id,
        email: 'demo@example.com',
        first_name: 'Demo',
        last_name: 'User',
        role: 'user',
        subscription_status: 'active',
        plan_type: 'monthly_subscription',
        strategy_packs_remaining: 10,
        has_initial_strategy_pack: true
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return;
    }

    console.log('Created user profile:', profileData);

    // Test login
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'demo@example.com',
      password: 'testpass123'
    });

    if (loginError) {
      console.error('Login error:', loginError);
      return;
    }

    console.log('Login successful, token:', loginData.session.access_token.substring(0, 20) + '...');
    
    return loginData.session.access_token;

  } catch (error) {
    console.error('Error:', error);
  }
}

createTestUser().then(token => {
  if (token) {
    console.log('Test user created successfully!');
    console.log('You can now test case creation with this user.');
  }
});