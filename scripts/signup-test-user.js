const { createClient } = require('@supabase/supabase-js');
// const 'fs');
// const 'path');

// Read .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const SUBAPASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUBAPASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUBAPASE_URL, SUPABASE_KEY);

const EMAIL = 'contact@indxr.ai';
const PASSWORD = 'test123456';

async function signUp() {
  console.log(`Attempting to sign up ${EMAIL}...`);
  const { data, error } = await supabase.auth.signUp({
    email: EMAIL,
    password: PASSWORD,
  });

  if (error) {
    console.error('Error signing up:', error.message);
    process.exit(1);
  }

  if (data.user && data.user.identities && data.user.identities.length === 0) {
      console.log('User already exists.');
      // Proceed to verification request anyway? Or assumes prompt flow.
      // If user exists, they might need login. But prompt says "After signup... display..."
      console.log('If the user already exists, please insure code is confirmed.');
  } else {
    console.log('Signup successful!');
  }

  console.log('\n==================================================');
  console.log(`Test account ${EMAIL} created/initiated.`);
  console.log('Please check your email and confirm the signup link.');
  console.log("Once confirmed, reply 'Confirmed' so I can proceed.");
  console.log('==================================================\n');
}

signUp();
