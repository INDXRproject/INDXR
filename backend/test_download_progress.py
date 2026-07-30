"""
Point 2: download-voortgang wordt gethrottled naar de DB geschreven, en NIET geschreven als yt-dlp het
totaal niet kent. Draait extract_youtube_audio met een gemockte yt_dlp + ffmpeg die de progress-hook
snel achter elkaar met synthetische statussen vuurt.

Draai: venv/bin/python3 test_download_progress.py
"""
import os
import tempfile
import audio_utils

WRITES = []  # (downloaded, total)


def _cb(done, total):
    WRITES.append((done, total))


class _FakeYDL:
    def __init__(self, opts):
        self.hooks = opts.get('progress_hooks', [])
        self.outtmpl = opts.get('outtmpl', '')
    def __enter__(self):
        return self
    def __exit__(self, *a):
        return False
    def extract_info(self, url, download=True):
        base = self.outtmpl.replace('.%(ext)s', '')
        # maak het "gedownloade" ruwe bestand zodat extract_youtube_audio verdergaat
        with open(base + '.webm', 'wb') as f:
            f.write(b'x' * 1024)
        # 50x snel achter elkaar MET totaal -> throttle moet dit tot 1 write knijpen
        for _ in range(50):
            for h in self.hooks:
                h({'status': 'downloading', 'downloaded_bytes': 1_000_000, 'total_bytes': 50_000_000})
        # zonder totaal -> mag NIET schrijven
        for h in self.hooks:
            h({'status': 'downloading', 'downloaded_bytes': 2_000_000})
        # finished -> geen write (niet 'downloading')
        for h in self.hooks:
            h({'status': 'finished', 'downloaded_bytes': 50_000_000, 'total_bytes': 50_000_000})
        return {'title': 'T', 'uploader': 'U'}


def _fake_ffmpeg(cmd, **kwargs):
    # laatste arg = output .ogg pad; maak het aan + returncode 0
    out = cmd[-1]
    with open(out, 'wb') as f:
        f.write(b'y' * 512)
    return type('R', (), {'returncode': 0, 'stderr': ''})()


def main():
    d = tempfile.mkdtemp()
    audio_utils.yt_dlp.YoutubeDL = _FakeYDL
    audio_utils.subprocess.run = _fake_ffmpeg

    path, title, channel, raw_bytes = audio_utils.extract_youtube_audio(
        'vid123', output_dir=d, proxy_urls=None, timeout_seconds=600, progress_cb=_cb)

    print("writes:", WRITES)
    print("returned:", os.path.basename(path), title, channel, raw_bytes)
    # 50 rapid-fire met totaal -> gethrottled tot precies 1; de no-total en finished -> geen extra
    assert len(WRITES) == 1, f"expected 1 throttled write, got {len(WRITES)}: {WRITES}"
    assert WRITES[0] == (1_000_000, 50_000_000), WRITES[0]
    print("\nPASS: 50 snelle callbacks -> 1 gethrottlede write; geen write zonder totaal; geen write op 'finished'.")


if __name__ == "__main__":
    main()
