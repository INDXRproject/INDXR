const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
async function run() {
  const env = fs.readFileSync('.env', 'utf8');
  const supabaseUrl = env.match(/SUPABASE_URL=(.*)/)[1];
  const supabaseKey = env.match(/SUPABASE_SERVICE_KEY=(.*)/)[1];
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('user_credits').select('*');
  console.log("All records in user_credits:", data);
}
run();
