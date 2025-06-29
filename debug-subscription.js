import { supabase, supabaseAdmin } from './server/db.js';

async function debugSubscription() {
  const testUserId = '8c0071a1-a2c6-4119-9bff-44e25fcf7e46';
  
  console.log('=== DEBUGGING SUBSCRIPTION ISSUE ===');
  console.log('Test User ID:', testUserId);
  
  try {
    // Step 1: Try to get user via admin
    console.log('\n1. Fetching user via supabaseAdmin.auth.admin.getUserById...');
    const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.getUserById(testUserId);
    
    if (adminError) {
      console.log('Admin fetch error:', adminError);
    } else {
      console.log('Admin fetch success:', {
        id: adminUser?.id,
        email: adminUser?.email,
        user_metadata: adminUser?.user_metadata,
        raw_user_meta_data: adminUser?.raw_user_meta_data
      });
    }
    
    // Step 2: Simulate the payment update
    console.log('\n2. Simulating payment update...');
    const updateResult = await supabaseAdmin.auth.admin.updateUserById(testUserId, {
      user_metadata: {
        planType: 'monthly_subscription',
        status: 'active',
        stripeSubscriptionId: 'demo_sub_' + Date.now(),
        stripeCustomerId: 'demo_cus_' + Date.now(),
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        strategyPacksRemaining: null,
        hasInitialStrategyPack: true
      }
    });
    
    console.log('Update result:', updateResult);
    
    // Step 3: Try to fetch again after update
    console.log('\n3. Fetching user again after update...');
    const { data: updatedUser, error: updatedError } = await supabaseAdmin.auth.admin.getUserById(testUserId);
    
    if (updatedError) {
      console.log('Updated fetch error:', updatedError);
    } else {
      console.log('Updated fetch success:', {
        id: updatedUser?.id,
        email: updatedUser?.email,
        user_metadata: updatedUser?.user_metadata,
        hasMetadata: !!updatedUser?.user_metadata,
        planType: updatedUser?.user_metadata?.planType
      });
    }
    
  } catch (error) {
    console.error('Debug script error:', error);
  }
}

debugSubscription();