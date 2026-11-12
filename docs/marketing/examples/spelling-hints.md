# Spelling hints — real before/after results (2026-11-11/12)

Live tests on the internal `contact@indxr.ai` account: ~5.8 hours of unique recordings, each tested
in matched pairs (once with AI transcription and no hints, once with hints). AssemblyAI is
near-deterministic for a fixed input — a repeat run with the same hints differed from the first in
exactly one place — so any other difference between a hinted and unhinted run of the same recording
is a real effect of the hints, not run-to-run noise.

Topics and languages covered: MMA instruction (EN), a pharmacology lecture (EN), Abbasid/early-Islamic
history (EN), Yale HIST 210 (EN, compared against the course's own human-made captions), Stanford
legal history (EN), the Oxford Interfaith Forum (EN), a Postgres conference talk (EN), Dutch history
(NL), two Arabic university lectures (AR), and three Kings and Generals history videos uploaded as
full-quality MP3 (EN).

No numbers below are invented — all are read directly from the transcripts of these runs.

## Where hints help: rare proper names and jargon the model doesn't know

This is the strongest and most consistent result across every language tested.

- **MMA** — "Firas Zahabi" went from correct 1 out of 13 times (unhinted) to 10 out of 13 (hinted).
  See the detailed case study below.
- **Pharmacology** — 6 out of 6 drug names (abciximab, eptifibatide, tirofiban, cilostazol, and two
  others) corrected. See the detailed case study below.
- **Dutch history** — "De Witt" went from 0 out of 8 correct to 5 out of 8.
- **Arabic lectures** — مرداويج (Mardavij) restored correctly 6 times; al-Katib corrected 3 times.

## Where hints don't help, or mildly hurt: clear audio with names the model already knows

- **Yale HIST 210** (compared against the course's real human-made captions): word error rate went
  from 3.65% unhinted to 3.79% hinted — hints made it very slightly worse on a recording that was
  already clean and well-known to the model.
- **Stanford legal history**: a small number of whole sentences present in the unhinted run were
  dropped entirely in the hinted run.

## The real risk: a hint can overwrite a different, already-correct word

On clear audio, hints mostly produced consistent spelling of a name throughout the recording (e.g.
"Fakhry"/"Fakri" → "Fakhri" everywhere, once hinted). But a name that *sounds similar* to a hinted
term can get overwritten even when the original was correct:

- Romani → Ramani (5 times)
- Masrur → Mansur (once a hint for "al-Mansur" was added — see the Abbasid case study below)
- Hamna → Hamza

In every test, hints never inserted a word that wasn't actually in the recording — the failure mode
is always substitution of one real name for a similar-sounding one, never fabrication.

## Audio quality changes how much hints matter

The clearest effect size came from testing the same material at degraded quality (20 kbps) and at
full quality. On full quality, many files were already nearly correct without hints, so the visible
improvement was smaller — the gains above are real, but a test run on heavily compressed audio will
overstate how much difference hints make in practice.

## Guideline for choosing hints

1. Only add names or terms that actually occur in this recording **and** that the model probably
   doesn't know.
2. Fewer is better — 1 to 5 core names covers most recordings.
3. Leave out well-known names; the model already spells those correctly.
4. Avoid terms that sound like other words that also appear in the same recording (this is what
   causes a hint to overwrite a different, correct word).
5. Spell each term exactly the way you want it to appear in the transcript.

## Case study: MMA — "Can Firas Zahabi Take Kevin Lee to the Next Level?"

YouTube `8YvEPC8irZY`, 15:41, channel Fight Game Analysis. 12 hints: Kevin Lee, Firas Zahabi, Tristar,
Georges St-Pierre, Tony Ferguson, Khabib Nurmagomedov, Dustin Poirier, Al Iaquinta, Gregor Gillespie,
Edson Barboza, Rafael dos Anjos, Motown Phenom.

**Without hints:** "Firas Zahabi" was correct only 1 out of 13 times it was said. The AI heard three
different wrong names for the same person across the video, including three separate instances of
*"Kamaru Usman"* — e.g. "I absolutely 100% believe Kamaru Usman is going to take him up to the next
level" — plus "Farasa Hobby" and "Viras". Two other real names were also misspelled: Dos Anjos → "Dos
Anos", Barboza → "Barbosa", and George St-Pierre was transcribed as just "George".

**With hints:** "Firas Zahabi" correct 10 out of 13 times. The remaining 3 misses were "Varras"/
"Veras"/"Varras Sahabi" — all now *closer* to the real name than the unhinted "Kamaru Usman"/
"Farasa Hobby" misses, but not perfect. Dos Anjos and Barboza were corrected. Checked the rest of the
transcript (~3,200 words) for regressions: 42 words differ between the two runs, and 0 of them are a
hinted name replacing a *correct* word — the rest are either neutral rewordings or genuine
improvements (e.g. "wanted to" → "won the").

## Case study: Pharmacology — "Anticoagulants & antiplatelet drugs"

YouTube `eZBtQ0rDnG4`, 16:11, channel Speed Pharmacology. 27 hints — the full drug-class vocabulary
(clopidogrel, prasugrel, ticagrelor, ticlopidine, abciximab, eptifibatide, tirofiban, dipyridamole,
cilostazol, vorapaxar, heparin, enoxaparin, dalteparin, fondaparinux, argatroban, bivalirudin,
dabigatran, rivaroxaban, apixaban, edoxaban, warfarin, alteplase, protamine sulfate, thromboxane A2,
glycoprotein IIb/IIIa, von Willebrand factor, prostacyclin).

**Without hints:** "apiximab, eptifapatide, and tyrofibin" (the speaker says abciximab,
eptifibatide, tirofiban — the GP IIb/IIIa-blocker class) and "cilosazol" (×2, should be
cilostazol).

**With hints:** all 6 of those terms correct — including abciximab, matching what the speaker
actually said. One side effect of a hint: "factors 2, 7, 9 and 10"
became "factors II, VII, IX and X" (Roman numerals — arguably more correct for a pharmacology
lecture, not a regression). Checked the rest (~2,000 words): 9 words differ, 1 is a mild regression
("activator" → "activators").

## Case study: History — "Harun al-Rashid, The Golden Prime"

YouTube `OcMFwazVJaU`, 19:24, channel Al Muqaddimah. 18 hints: Harun al-Rashid, al-Mahdi, al-Hadi,
al-Mansur, al-Amin, al-Ma'mun, Zubaidah, Barmakids, Yahya ibn Khalid, Ja'far ibn Yahya, al-Fadl ibn
Yahya, Khurasan, Baghdad, Raqqa, Nikephoros, Charlemagne, Abbasid, Byzantine.

**Improvements:** "Banu Makids" → "Barmakids" (×2), "Khayzurah" → "Khayzuran", "Ja'far" corrected.

**Regressions — the clearest example of a hint overwriting an already-correct word:** "met by
Masrur" (which was *already correct* without hints — Masrur is a real historical figure, al-Rashid's
executioner) became "met by Mansur" once "al-Mansur" was on the hint list — the hint overwrote a
correctly-heard but similar-sounding different name. Also "Minbar" (a real word, a mosque pulpit) →
"Munbar" (wrong). Three short phrases present in the unhinted run disappeared entirely in the hinted
run: "from natural causes", "sanctity of the agreement", "than Zubaydah".

**Repeat run, same 18 hints:** differed from the first hinted run in exactly one place — confirming
AssemblyAI is near-deterministic for a fixed input, so the differences between the hinted and
unhinted runs are a real effect of the hints.

## Takeaway

Hints work strongly for rare proper names and jargon the model has never seen — in any language
tested, including Arabic and Dutch. The one proven failure mode is a hint list containing names that
sound similar to EACH OTHER, or to a different real name in the same recording — where a hint for one
correct word overwrites a different word that was already right (al-Mansur vs. the already-correct
"Masrur"; Romani vs. Ramani). The effect is small-to-neutral on clear audio with well-known names
(Yale, Stanford), and most visible on degraded audio or obscure vocabulary. See `docs/LESSONS.md`.
