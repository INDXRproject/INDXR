const { YoutubeTranscript } = require('youtube-transcript');

async function check() {
  try {
    const videoId = 'gTOnEQ80W5U';
    console.log(`Fetching transcript for ${videoId}...`);
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    console.log('Type of transcript:', typeof transcript);
    console.log('Is Array?', Array.isArray(transcript));
    if (Array.isArray(transcript)) {
        console.log('Length:', transcript.length);
    }
    console.log('JSON Value:', JSON.stringify(transcript, null, 2));
    
  } catch (error) {
    console.error('Error caught:', error);
  }
}

check();
