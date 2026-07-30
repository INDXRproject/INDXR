"""
Point 1 (geldpad): op een gereserveerd pad moet de refund VÓÓR de status='error'-write komen, zodat het
terminale Realtime-bericht credits_refunded al draagt (de frontend markeert af op dat eerste bericht).

Forceert een download-mislukking in do_assemblyai_transcription met reservation_mode=True en bewijst dat
refund_with_retry precies één keer wordt aangeroepen en STRIKT vóór de status='error'-update. Geen echte
AssemblyAI/YouTube/Supabase: de externe randen zijn gemonkeypatcht.

Draai: ASSEMBLYAI_API_KEY=x SUPABASE_URL=... venv/bin/python3 test_refund_before_error.py
"""
import asyncio
import transcription_pipeline as tp

CALLS = []  # geordend logboek van (soort, detail)


class _FakeSupabase:
    def table(self, _name):
        return _Dual()


class _Dual:
    def __init__(self):
        self._payload = None
    def select(self, *_a, **_k):
        self._mode = 'select'; return self
    def update(self, cols):
        self._mode = 'update'; self._payload = cols; return self
    def eq(self, *_a, **_k):
        return self
    def single(self):
        return self
    def execute(self):
        if getattr(self, '_mode', None) == 'update':
            CALLS.append(('update', self._payload.get('status'), 'credits_refunded' in self._payload))
            return type('R', (), {'data': None})()
        return type('R', (), {'data': {'credits_reserved': 76}})()


async def _fake_refund(job_id=None, playlist_id=None, **kw):
    CALLS.append(('refund', job_id))
    return {'success': True, 'refunded': 76}


async def _fake_master_read(*a, **k):
    return None


def _fake_proxy(*a, **k):
    return None


def _boom(*a, **k):
    raise Exception("HTTP Error 500: Server Error")


def main():
    tp.get_supabase_client = lambda: _FakeSupabase()
    tp.refund_with_retry = _fake_refund
    tp.master_transcripts_read = _fake_master_read
    tp.get_proxy_url = _fake_proxy
    tp.extract_youtube_audio = _boom

    res = asyncio.run(tp.do_assemblyai_transcription(
        "user-1", "vid123", job_id="job-1", reservation_mode=True))

    print("result:", res)
    print("call order:")
    for c in CALLS:
        print("  ", c)

    refund_idx = next((i for i, c in enumerate(CALLS) if c[0] == 'refund'), None)
    error_idx = next((i for i, c in enumerate(CALLS) if c[0] == 'update' and c[1] == 'error'), None)
    refund_count = sum(1 for c in CALLS if c[0] == 'refund')

    assert res.get('success') is False, res
    assert refund_idx is not None, "refund never called on a reserved failure"
    assert error_idx is not None, "status='error' never written"
    assert refund_idx < error_idx, f"refund ({refund_idx}) must precede status=error ({error_idx})"
    assert refund_count == 1, f"refund must fire exactly once, got {refund_count}"
    # de downloading-update mag GEEN refund triggeren
    dl = next((i for i, c in enumerate(CALLS) if c[0] == 'update' and c[1] == 'downloading'), None)
    if dl is not None:
        assert dl < refund_idx, "downloading update should come before the refund (no refund on non-error)"
    print("\nPASS: refund fires exactly once, strictly before the status='error' write.")


if __name__ == "__main__":
    main()
