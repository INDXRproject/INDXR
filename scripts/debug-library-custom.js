const RE_XML_TRANSCRIPT = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;

const USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
];

async function fetchTranscript(videoId) {
    const identifier = 'gTOnEQ80W5U';
    
    // Get Base URL first like before...
    console.log(`Getting Base URL for ${identifier}...`);
    const initialUA = USER_AGENTS[0];
    const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${identifier}`, {
        headers: { 'User-Agent': initialUA },
    });
    const videoPageBody = await videoPageResponse.text();
    const splittedHTML = videoPageBody.split('"captions":');
    
    if (splittedHTML.length <= 1) { 
        console.error("Failed to find captions in HTML");
        return; 
    }
    
    const jsonStr = splittedHTML[1].split(',"videoDetails')[0].replace('\n', '');
    const captions = JSON.parse(jsonStr).playerCaptionsTracklistRenderer;
    let transcriptURL = captions.captionTracks[0].baseUrl;
    if (!transcriptURL.includes('fmt=xml')) transcriptURL += '&fmt=xml';

    console.log(`\nBase Transcript URL: ${transcriptURL}`);

    // Try without any custom headers
    console.log(`\n--- Attempt 4: Minimal Headers (Node default) ---`);
    
    // Note: Node's fetch might add some defaults, but we won't set UA explicitly
    const res = await fetch(transcriptURL);
    
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Length: ${text.length}`);
    if (text.length > 0) {
        console.log("SUCCESS! Found content.");
        console.log(text.substring(0, 200));
    } else {
        console.log("Empty response.");
    }
}

fetchTranscript();
