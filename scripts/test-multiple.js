const { YoutubeTranscript } = require('youtube-transcript');

const videos = [
  { id: 'jNQXAC9IVRw', name: 'Me at the zoo' },
  { id: 'gTOnEQ80W5U', name: 'User Video 1 (DeepSeek)' },
  { id: 'tyR1yVC7U4Q', name: 'User Video 2' },
  { id: 'M7FIvfx5J10', name: 'Rick Roll (Manual Captions usually)' },
];

async function testAll() {
  for (const video of videos) {
    console.log(`\nTesting: ${video.name} (${video.id})`);
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(video.id);
      console.log(`Result: SUCCESS - ${transcript.length} items`);
      if (transcript.length > 0) {
        console.log(`Sample: "${transcript[0].text}"`);
      }
    } catch (err) {
      console.log(`Result: FAILED - ${err.message}`);
    }
  }
}

testAll();
