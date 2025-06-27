import { supabaseAdmin } from '../server/db';

async function getUserByEmail(email: string) {
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;
    
    const user = users.find(u => u.email === email);
    if (user) {
      console.log('User found:');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('Created:', user.created_at);
      return user.id;
    } else {
      console.log('User not found');
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// Usage: tsx scripts/get-user-id.ts <email>
if (import.meta.url === `file://${process.argv[1]}`) {
  const email = process.argv[2];
  if (!email) {
    console.log('Usage: tsx scripts/get-user-id.ts <email>');
    process.exit(1);
  }
  getUserByEmail(email).then(() => process.exit(0));
}

export { getUserByEmail };