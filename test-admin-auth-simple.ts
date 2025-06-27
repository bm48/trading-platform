import { supabaseAdmin } from './server/db';

async function testSimpleAuth() {
  try {
    console.log('Testing simple admin authentication...');
    
    // Test Supabase Auth login
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: 'hello@projectresolveai.com',
      password: 'helloresolveaiproject'
    });
    
    if (authError) {
      console.log('❌ Supabase Auth failed:', authError.message);
      return;
    }
    
    console.log('✅ Supabase Auth successful');
    console.log('User ID:', authData.user.id);
    console.log('Access Token exists:', !!authData.session.access_token);
    
    // Test direct SQL query for user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .rpc('get_user_profile', { user_id: authData.user.id });
    
    if (profileError) {
      console.log('❌ Profile query failed with RPC:', profileError.message);
      
      // Try direct table query
      const { data: directProfile, error: directError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
        
      if (directError) {
        console.log('❌ Direct table query failed:', directError.message);
      } else {
        console.log('✅ Direct table query successful:', directProfile);
      }
    } else {
      console.log('✅ RPC query successful:', userProfile);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testSimpleAuth();