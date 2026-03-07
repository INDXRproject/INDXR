const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
async function run() {
  const env = fs.readFileSync('.env', 'utf8');
  const supabaseUrl = env.match(/SUPABASE_URL=(.*)/)[1];
  const supabaseKey = env.match(/SUPABASE_SERVICE_KEY=(.*)/)[1];
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: q1 } = await supabase.from('profiles').select('*').limit(5);
  console.log("Profiles:", q1);
  const { data: q2 } = await supabase.from('users').select('*').limit(5);
  console.log("Users:", q2);
}
run();
