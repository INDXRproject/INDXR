# Spelling hints — real before/after results (2026-11-11)

Live test on the internal `contact@indxr.ai` account, 3 real YouTube videos, 16–19 minutes each, each
run once with AI transcription and no hints, once with hints, one repeated. No numbers below are
invented — all are read directly from the transcripts of these runs.

## MMA — "Can Firas Zahabi Take Kevin Lee to the Next Level?"

YouTube `8YvEPC8irZY`, 15:41, channel Fight Game Analysis. 12 hints: Kevin Lee, Firas Zahabi, Tristar,
Georges St-Pierre, Tony Ferguson, Khabib Nurmagomedov, Dustin Poirier, Al Iaquinta, Gregor Gillespie,
Edson Barboza, Rafael dos Anjos, Motown Phenom.

**Without hints:** "Firas Zahabi" was correct only 1 out of 13 times it was said. The AI heard three
different wrong names for the same person across the video, including three separate instances of
*"Kamaru Usman"* — e.g. "I absolutely 100% believe Kamaru Usman is going to take him up to the next
level" — plus "Farasa Hobby" and "Viras". Two other real names were also misspelled: Dos Anjos → "Dos
Anos", Barboza → "Barbosa", and George St-Pierre was transcribed as just "George".

**With hints:** "Firas Zahabi" correct 9 out of 13 times. The remaining 4 misses were "Varras" (×2),
"Veras", and "Varras Sahabi" — all now *closer* to the real name than the unhinted "Kamaru Usman"/
"Farasa Hobby" misses, but not perfect. Dos Anjos and Barboza were corrected. Checked the rest of the
transcript (~3,200 words) for regressions: 42 words differ between the two runs, and 0 of them are a
hinted name replacing a *correct* word — the rest are either neutral rewordings or genuine
improvements (e.g. "wanted to" → "won the").

## Pharmacology — "Anticoagulants & antiplatelet drugs"

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

## History — "Harun al-Rashid, The Golden Prime"

YouTube `OcMFwazVJaU`, 19:24, channel Al Muqaddimah. 18 hints: Harun al-Rashid, al-Mahdi, al-Hadi,
al-Mansur, al-Amin, al-Ma'mun, Zubaidah, Barmakids, Yahya ibn Khalid, Ja'far ibn Yahya, al-Fadl ibn
Yahya, Khurasan, Baghdad, Raqqa, Nikephoros, Charlemagne, Abbasid, Byzantine.

**Improvements:** "Banu Makids" → "Barmakids" (×2), "Khayzurah" → "Khayzuran", "Ja'far" corrected.

**Regressions — the one real risk case found in this test:** "met by Masrur" (which was *already
correct* without hints — Masrur is a real historical figure, al-Rashid's executioner) became "met by
Mansur" once "al-Mansur" was on the hint list — the hint overwrote a correctly-heard but
similar-sounding different name. Also "Minbar" (a real word, a mosque pulpit) → "Munbar" (wrong).
Three short phrases present in the unhinted run disappeared entirely in the hinted run: "from natural
causes", "sanctity of the agreement", "than Zubaydah".

**Repeat run, same 18 hints:** differed from the first hinted run in exactly one place. AssemblyAI is
essentially deterministic for a fixed input — the differences between the hinted and unhinted runs
are a real effect of the hints, not run-to-run noise.

## Takeaway

Hints work strongly for rare proper names and jargon the model has never seen (MMA names, drug
names). The one proven failure mode is a list containing names that sound similar to EACH OTHER —
not simply "too many terms" — where a hint for one correct word overwrote a different word that was
already right (al-Mansur vs. the already-correct "Masrur"). See `docs/LESSONS.md`.
