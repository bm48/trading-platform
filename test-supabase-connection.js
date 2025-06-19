// Test Supabase connection and check if tables exist
import { createClient } from '@supabase/supabase-js';

async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
      console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'Missing');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection
    console.log('Checking Supabase connection...');
    const { data, error } = await supabase.from('applications').select('count');
    
    if (error) {
      console.error('Supabase connection error:', error);
      console.log('This likely means the applications table does not exist yet.');
      console.log('\nTo fix this:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Open the SQL Editor');
      console.log('3. Copy and paste the contents of supabase-migration.sql');
      console.log('4. Run the SQL to create all tables');
    } else {
      console.log('✅ Supabase connection successful!');
      console.log('Applications table exists and is accessible');
    }
    
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testSupabaseConnection();