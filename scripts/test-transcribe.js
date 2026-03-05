const { createClient } = require('@supabase/supabase-js');
// const 'fs');
// const 'path');
const { YoutubeTranscript } = require('youtube-transcript');

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
// A short video for testing: "Me at the zoo"
const VIDEO_ID = 'jNQXAC9IVRw'; 

async function testTranscribeFlow() {
  // 1. Sign In
  console.log(`1. Signing in as ${EMAIL}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    process.exit(1);
  }
  
  const userId = authData.user.id;
  console.log(`   Logged in. User ID: ${userId}`);

  // 2. Fetch Transcript (Simulation of /api/extract)
  console.log(`2. Fetching transcript for video ${VIDEO_ID}...`);
  let transcript;
  try {
    transcript = await YoutubeTranscript.fetchTranscript(VIDEO_ID);
    console.log(`   Transcript fetched. Length: ${transcript.length} items`);
  } catch (err) {
    console.error('   Failed to fetch transcript:', err);
    process.exit(1);
  }

  // 3. Save to Supabase (Simulation of /dashboard/transcribe save logic)
  console.log('3. Saving to Supabase "transcripts" table...');
  const { data: insertData, error: insertError } = await supabase
    .from('transcripts')
    .insert({
      user_id: userId,
      video_id: VIDEO_ID,
      transcript: transcript
    })
    .select();

  if (insertError) {
    console.error('   Save failed:', insertError.message);
    console.error('   Details:', insertError);
    process.exit(1);
  }

  console.log('   Saved successfully.');
  console.log(JSON.stringify(insertData, null, 2));

  // 4. Verify Listing (Simulation of /dashboard/library)
  console.log('4. Verifying listing in Supabase...');
  const { data: listData, error: listError } = await supabase
    .from('transcripts')
    .select('*')
    .eq('user_id', userId)
    .eq('video_id', VIDEO_ID);

  if (listError) {
    console.error('   Listing failed:', listError.message);
    process.exit(1);
  }

  if (listData.length > 0) {
    console.log('   Verification successful! Found record in DB.');
  } else {
    console.error('   Verification failed! Record not found.');
    process.exit(1);
  }
  
  console.log('\nSUCCESS: Test user flow confirmed (Login -> Extract -> Save -> Verify)');
}

testTranscribeFlow();
