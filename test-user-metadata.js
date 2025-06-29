import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.DATABASE_URL?.replace('postgresql://', '')?.replace('/postgres', '') || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testUserMetadata() {
  try {
    // Get the user that we've been testing with
    const testUserId = '8c0071a1-a2c6-4119-9bff-44e25fcf7e46';
    
    console.log('Fetching user metadata for:', testUserId);
    
    const { data: user, error } = await supabase.auth.admin.getUserById(testUserId);
    
    if (error) {
      console.error('Error fetching user:', error);
      return;
    }
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User data:', {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      raw_user_meta_data: user.raw_user_meta_data,
      app_metadata: user.app_metadata
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testUserMetadata();