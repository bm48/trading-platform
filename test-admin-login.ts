import { supabaseAdmin } from './server/db';

async function testAdminLogin() {
  try {
    console.log('Testing admin login with provided credentials...');
    
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: 'hello@projectresolveai.com',
      password: 'helloresolveaiproject'
    });
    
    if (error) {
      console.log('❌ Login failed:', error.message);
      console.log('Error code:', error.code);
      
      // Check if user exists
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const user = users.users.find(u => u.email === 'hello@projectresolveai.com');
      if (user) {
        console.log('✅ User exists in auth system');
        console.log('User ID:', user.id);
        console.log('Email confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
      } else {
        console.log('❌ User not found in auth system');
      }
    } else {
      console.log('✅ Login successful!');
      console.log('User email:', data.user.email);
      console.log('Access token exists:', !!data.session.access_token);
    }
  } catch (err) {
    console.error('Test error:', err);
  }
}

testAdminLogin();