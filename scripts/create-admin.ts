import { supabaseAdmin } from '../server/db';

async function createAdminUser(email: string, password: string) {
  try {
    console.log('Creating admin user...');
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError) {
      throw authError;
    }

    console.log('Admin user created in auth:', authData.user.id);

    // Create user profile with admin role
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
      })
      .select()
      .single();

    if (profileError) {
      throw profileError;
    }

    console.log('Admin profile created:', profileData);
    console.log('✅ Admin user created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: admin`);
    
    return { success: true, userId: authData.user.id };
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    return { success: false, error };
  }
}

// Usage: tsx scripts/create-admin.ts <email> <password>
if (import.meta.url === `file://${process.argv[1]}`) {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.log('Usage: tsx scripts/create-admin.ts <email> <password>');
    console.log('Example: tsx scripts/create-admin.ts admin@example.com SecurePassword123!');
    process.exit(1);
  }

  createAdminUser(email, password).then(() => {
    process.exit(0);
  });
}

export { createAdminUser };