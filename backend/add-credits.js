const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
  try {
    const env = fs.readFileSync('.env', 'utf8');
    const supabaseUrl = env.match(/SUPABASE_URL=(.*)/)[1];
    const supabaseKey = env.match(/SUPABASE_SERVICE_KEY=(.*)/)[1];
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Fetching users...");
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError || !userData || !userData.users || userData.users.length === 0) {
        console.log("No users found.");
        process.exit(1);
    }
    
    const userId = userData.users[0].id;
    console.log("Found user ID:", userId);
    
    // Check current credits in user_credits
    const { data: creditData } = await supabase.from('user_credits').select('*').eq('user_id', userId).single();
    console.log("Current credit data:", creditData);
    
    const currentCredits = creditData ? creditData.credits : 0;
    const newCredits = currentCredits + 20;
    
    // Add 20 credits
    const { error: upsertError } = await supabase.from('user_credits').upsert({
        user_id: userId,
        credits: newCredits
    });
    
    if (upsertError) {
        console.error("Failed to add credits:", upsertError);
    } else {
        console.log(`Successfully added 20 credits. New balance: ${newCredits}`);
    }
  } catch (err) {
      console.error(err);
  } finally {
      process.exit(0);
  }
}
run();
