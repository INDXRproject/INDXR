"""Idempotentiesleutels op credit-reserverende endpoints (ADR-019).

Eén sleutel per logische handeling (client-gemunt). De server CLAIMT de sleutel atomisch (PK-insert):
- wint de insert  → de caller doet het werk (job aanmaken met het meegegeven job_id + reserveren);
- botst (23505)   → duplicate; geef het opgeslagen job_id terug (geen tweede reservering, geen fout);
- ander hash      → zelfde sleutel, andere bedoeling = clientfout → caller antwoordt 422.

`job_id` wordt bij het claimen meegeschreven (vooraf gegenereerd), zodat de verliezer altijd een job_id
ziet — geen NULL-venster. Raakt reserve/settle/refund NIET aan; het is een laag vóór de reservering.
"""

import hashlib
from typing import Optional


def request_hash(*parts) -> str:
    """Stabiele hash van de betekenisvolle request-velden. None → lege string zodat de vorm vast is."""
    raw = "|".join("" if p is None else str(p) for p in parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def content_hash(data: Optional[bytes]) -> str:
    """Hash van de upload-inhoud — zodat één idempotentiesleutel niet twee verschillende bestanden dekt."""
    return hashlib.sha256(data).hexdigest() if data else "no-bytes"


def lookup_idempotency(supabase, key: str, req_hash: str) -> Optional[dict]:
    """Snelle lees vóór de concurrency-cap: bestaat de sleutel al? Retourneert {'existing': job_id} of
    {'mismatch': True} of None (nog niet geclaimd). De ATOMISCHE garantie zit in claim_idempotency; dit is
    puur een optimalisatie zodat een duplicaat-van-een-lopende-job niet tegen de cap aanloopt."""
    row = supabase.table("idempotency_keys").select("job_id,request_hash").eq("key", key).limit(1).execute()
    if not row.data:
        return None
    r = row.data[0]
    if r.get("request_hash") != req_hash:
        return {"mismatch": True}
    return {"existing": r.get("job_id")}


def release_idempotency(supabase, key: str) -> None:
    """Maak een sleutel weer vrij als het werk ná een winnende claim toch mislukte (insert/reserve faalde),
    zodat de sleutel niet naar een niet-bestaande job blijft wijzen. Non-fataal."""
    try:
        supabase.table("idempotency_keys").delete().eq("key", key).execute()
    except Exception:
        pass


def claim_idempotency(supabase, key: str, user_id: str, req_hash: str, kind: str, job_id: str) -> dict:
    """Atomische claim. Retourneert precies één van:
      {'claimed': True}          — gewonnen; maak de job met `job_id` + reserveer.
      {'existing': <job_id str>} — duplicate; geef dit job_id terug (deduplicated).
      {'mismatch': True}         — zelfde sleutel, ander request_hash → 422.
      {'retry': True}            — zeldzame race (rij verdween tussen botsing en lezen) → 409/retry.
    """
    try:
        supabase.table("idempotency_keys").insert({
            "key": key,
            "user_id": user_id,
            "request_hash": req_hash,
            "kind": kind,
            "job_id": job_id,
        }).execute()
        return {"claimed": True}
    except Exception as e:
        msg = str(e)
        if "23505" in msg or "duplicate key" in msg or "idempotency_keys_pkey" in msg:
            row = supabase.table("idempotency_keys").select("job_id,request_hash").eq("key", key).limit(1).execute()
            if not row.data:
                return {"retry": True}
            r = row.data[0]
            if r.get("request_hash") != req_hash:
                return {"mismatch": True}
            return {"existing": r.get("job_id")}
        raise
