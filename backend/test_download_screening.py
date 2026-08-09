"""
ADR-095 — vroege snelheidsscreening bij YouTube-audio-download. Deterministisch (gemockte yt_dlp +
ffmpeg + nep-klok), zodat de screening-beslissing bewezen wordt zonder een echt traag exit-IP af te
wachten. Bewijst:
  1) een traag exit-IP (doorvoer < v_floor(p)) op een NIET-laatste poging → SlowExitScreened →
     RETRY met verse sessie (geen job-fout), gelogd als outcome=screen_abort met doorvoer + moment;
  2) de LAATSTE poging screent NIET (dezelfde trage trajectorie mag daar niet afbreken → job slaagt);
  3) v_floor(p) = v_norm·(1−p)/(1+p): daalt monotoon, v_floor(0)=v_norm, v_floor(1)=0.

Draai: venv/bin/python3 -m pytest test_download_screening.py -q   (of: python3 test_download_screening.py)
"""
import logging
import tempfile
import audio_utils
from audio_utils import SlowExitScreened

VNORM = 287500.0  # 2,3 Mbit/s mediaan


class _Clock:
    """Nep-klok: time() leest, sleep() advanced (geen echte wachttijd in de test)."""
    def __init__(self, t0=1000.0):
        self.t = t0
    def time(self):
        return self.t
    def sleep(self, s):
        self.t += s


def _v_floor(v_norm, p):
    return v_norm * (1 - p) / (1 + p)


class _FakeYDL:
    """Per poging geïnstantieerd. clk-gedeeld. `plan[n]` bepaalt of poging n traag of normaal is."""
    def __init__(self, opts, clk, counter, plan, attempts_seen):
        self.hooks = opts.get('progress_hooks', [])
        self.outtmpl = opts.get('outtmpl', '')
        self.clk = clk
        self.counter = counter
        self.plan = plan
        self.attempts_seen = attempts_seen

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def extract_info(self, url, download=True):
        self.counter[0] += 1
        n = self.counter[0]
        base = self.outtmpl.replace('.%(ext)s', '')
        behaviour = self.plan(n)
        self.attempts_seen.append((n, behaviour))
        if behaviour == 'slow':
            # partial op disk (echte egress-meting), dan een trage trajectorie: eerste byte, klok
            # +12s (> SCREEN_MIN_SAMPLE_SECONDS), dan een tweede tick met minieme voortgang → de hook
            # moet SlowExitScreened gooien (tenzij screening uit staat = laatste poging).
            with open(base + '.webm', 'wb') as f:
                f.write(b'x' * 5000)
            for h in self.hooks:
                h({'status': 'downloading', 'downloaded_bytes': 1000, 'total_bytes': 1_000_000})
            self.clk.t += 12.0
            for h in self.hooks:
                h({'status': 'downloading', 'downloaded_bytes': 5000, 'total_bytes': 1_000_000})
            # Als we hier komen, heeft de hook NIET gescreend (screening uit) → laat de download
            # 'slagen' zodat scenario B (laatste poging screent niet) tot een geslaagde job leidt.
            with open(base + '.webm', 'wb') as f:
                f.write(b'y' * 900_000)
            return {'title': 'T', 'uploader': 'U'}
        else:  # 'ok'
            with open(base + '.webm', 'wb') as f:
                f.write(b'y' * 900_000)
            for h in self.hooks:
                h({'status': 'downloading', 'downloaded_bytes': 900_000, 'total_bytes': 900_000})
            return {'title': 'T', 'uploader': 'U'}


def _fake_ffmpeg(cmd, **kwargs):
    out = cmd[-1]
    with open(out, 'wb') as f:
        f.write(b'z' * 512)
    return type('R', (), {'returncode': 0, 'stderr': ''})()


class _Capture(logging.Handler):
    def __init__(self):
        super().__init__()
        self.lines = []
    def emit(self, record):
        self.lines.append(record.getMessage())


def _run(plan):
    clk = _Clock()
    counter = [0]
    attempts_seen = []
    orig_time, orig_sleep, orig_ydl, orig_run = (
        audio_utils.time.time, audio_utils.time.sleep, audio_utils.yt_dlp.YoutubeDL, audio_utils.subprocess.run,
    )
    cap = _Capture()
    cap.setLevel(logging.INFO)
    _orig_level = audio_utils.logger.level
    audio_utils.logger.setLevel(logging.INFO)
    audio_utils.logger.addHandler(cap)
    try:
        audio_utils.time.time = clk.time
        audio_utils.time.sleep = clk.sleep
        audio_utils.yt_dlp.YoutubeDL = lambda opts: _FakeYDL(opts, clk, counter, plan, attempts_seen)
        audio_utils.subprocess.run = _fake_ffmpeg
        d = tempfile.mkdtemp()
        path, title, channel, egress = audio_utils.extract_youtube_audio(
            'vidSCREEN', output_dir=d, proxy_urls=['p1', 'p2', 'p3'],
            timeout_seconds=6000, screen_normal_bytes_per_sec=VNORM,
        )
        return path, egress, attempts_seen, cap.lines
    finally:
        audio_utils.time.time, audio_utils.time.sleep = orig_time, orig_sleep
        audio_utils.yt_dlp.YoutubeDL, audio_utils.subprocess.run = orig_ydl, orig_run
        audio_utils.logger.removeHandler(cap)
        audio_utils.logger.setLevel(_orig_level)


def test_floor_shape():
    assert abs(_v_floor(VNORM, 0.0) - VNORM) < 1e-6          # p=0 → v_norm
    assert abs(_v_floor(VNORM, 1.0) - 0.0) < 1e-6            # p=1 → 0
    vals = [_v_floor(VNORM, p) for p in (0.0, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99)]
    assert all(a > b for a, b in zip(vals, vals[1:]))        # strikt dalend


def test_slow_then_normal_screens_and_retries():
    # Poging 1 traag → screen_abort + retry; poging 2 normaal → succes.
    plan = lambda n: 'slow' if n == 1 else 'ok'
    path, egress, attempts, lines = _run(plan)
    assert path.endswith('.ogg')                                   # job slaagde (geen fout)
    assert attempts == [(1, 'slow'), (2, 'ok')]                    # precies 1 screen-retry
    screen_lines = [l for l in lines if 'outcome=screen_abort' in l]
    assert len(screen_lines) == 1, lines
    assert 'screen_throughput_mb_s=' in screen_lines[0] and 'screen_at_progress=' in screen_lines[0]
    print("PASS slow→normal:", screen_lines[0])


def test_last_attempt_does_not_screen():
    # Alle pogingen dezelfde trage trajectorie. 1 & 2 screenen; 3 (laatste) screent NIET → slaagt.
    plan = lambda n: 'slow'
    path, egress, attempts, lines = _run(plan)
    assert path.endswith('.ogg'), "laatste poging moet slagen (geen screening)"
    assert attempts == [(1, 'slow'), (2, 'slow'), (3, 'slow')]
    screen_lines = [l for l in lines if 'outcome=screen_abort' in l]
    assert len(screen_lines) == 2, f"alleen poging 1&2 screenen, niet de laatste: {screen_lines}"
    print(f"PASS last-attempt-no-screen: {len(screen_lines)} screen-aborts, job slaagde op poging 3")


if __name__ == "__main__":
    test_floor_shape()
    test_slow_then_normal_screens_and_retries()
    test_last_attempt_does_not_screen()
    print("\nALLE SCREENING-TESTS GROEN")
