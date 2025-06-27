import { supabaseAdmin } from './server/db';

async function resetAdminPassword() {
  try {
    console.log('Resetting admin password...');
    
    // Update password for the admin user
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      '5e5dd4f8-51ca-4041-b51e-1aa13101da9c',
      {
        password: 'helloresolveaiproject'
      }
    );
    
    if (error) {
      console.log('❌ Password reset failed:', error.message);
    } else {
      console.log('✅ Password reset successful!');
      console.log('User ID:', data.user.id);
      console.log('Email:', data.user.email);
      
      // Test login with new password
      console.log('\nTesting login with new password...');
      const { data: loginData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
        email: 'hello@projectresolveai.com',
        password: 'helloresolveaiproject'
      });
      
      if (loginError) {
        console.log('❌ Login test failed:', loginError.message);
      } else {
        console.log('✅ Login test successful!');
      }
    }
  } catch (err) {
    console.error('Reset error:', err);
  }
}

resetAdminPassword();