# AI-summary voorbeeld — Justice-lezing (gemeten, 2026-08-24)

**Aard:** één **echte**, door het live product gegenereerde AI-samenvatting (ADR-090: overkoepelende samenvatting + hoofdstukken met klikbaar tijdstempel), vastgelegd zodat de cijfers én het voorbeeldfragment niet opnieuw verdwijnen. Dit zijn precies de getallen die `backend/e2e_summary_measure.py` **berekent maar nooit wegschrijft**. Bron voor het samenvatten-artikel + de `summary-overview`/`summary-chapter`-captures (zie [screenshot-machine.md](screenshot-machine.md)).

**Keuze van transcript.** Gekozen: de geseede **Justice-lezing** (`kBdfcR-8hEY`, Harvard, transcript `0798fa30-8056-4343-9e02-c50d93c00e4a`). Reden: het is het **enige** geseede transcript met echte, substantiële, Engelstalige, neutrale, multi-hoofdstuk-inhoud **plus een videoId** (→ klikbare amber tijdstempels in de samenvatting). De andere "geseede" rijen (Feynman/MIT/Stanford/CS50/consciousness) zijn **3-woords display-stubs** (hun library-woordtelling is cosmetisch) en kunnen niet zinnig samengevat worden; de Dave-Chappelle-upload is 5:19 met wat ruw taalgebruik en heeft geen videoId; het Sarah-Chen-seed-interview is 72 s / 213 woorden — te dun voor meerdere hoofdstukken. De trolley-problem-ethiek van de Justice-lezing is standaard, wereldwijd onderwezen lesmateriaal en neutraal genoeg voor een publieke pagina.

## Gemeten cijfers

| Meting | Waarde |
|---|---|
| Videoduur | **54:42** (3282 s) |
| Transcriptwoorden | **6,987** (1142 caption-segmenten, `youtube_captions`) |
| Hoofdstukken | **2** (model koos 2 voor deze 2-delige lezing) |
| Samenvattingswoorden | **1,794** (overview 203 + hoofdstukken 1591) |
| Verhouding samenvatting : transcript | **0.257** — de samenvatting is ~25.7% van het transcript (≈ 1 samenvattingswoord per 3.9 transcriptwoorden) |
| Doorlooptijd (start→klaar) | **~35 s** (09:19:44 → 09:20:19 UTC) |
| In rekening gebrachte credits | **6** (= `calculate_summary_cost(3282)` = 3 + ⌈(3282−1800)/600⌉, ADR-098 Add.2; was 5 onder de oude /1200-formule) |
| Model / schema | `gemini-2.5-flash` (twee-staps, ADR-090) / schema_version 2 |
| Job-id | `153894f1-2ac0-44f3-bcbb-5b56814a13b8` |

## Overkoepelende samenvatting (verbatim, 203 woorden)

This video introduces the concept of justice by presenting a series of moral dilemmas, starting with the classic trolley problem and its variations (the 'fat man' case, medical scenarios involving patient prioritization and organ donation). These thought experiments serve to illuminate two primary modes of moral reasoning: consequentialist ethics, which judges the morality of an action by its outcomes, and categorical ethics, which asserts certain actions are inherently right or wrong regardless of consequences.

The lecture then formally introduces Jeremy Bentham's utilitarianism as a foundational consequentialist theory, emphasizing the principle of maximizing overall happiness or utility. It contrasts this with the categorical approach, foreshadowing the later discussion of Immanuel Kant's philosophy.

The core of the video then shifts to a detailed examination of the real-life historical case of *Queen v. Dudley and Stephens*, involving cannibalism at sea due to extreme necessity. This case is used to facilitate a vigorous classroom debate, exploring the complexities of applying utilitarian principles versus categorical moral prohibitions, and probing the moral significance of necessity, consent, and fair procedures. The video concludes by highlighting the profound questions raised about the nature of rights and the role of individual autonomy in moral justification, setting the stage for further philosophical inquiry.

## Hoofdstuk 1 (verbatim — kop + tijdstempel, 814 woorden)

### Introduction to Moral Dilemmas and Foundational Ethical Reasoning — [0:00]

The course begins by exploring a series of moral dilemmas to introduce foundational ethical reasoning.

**1. The Trolley Problem (Variant 1: Driver)**
*   **Scenario:** You are the driver of a trolley car whose brakes have failed. Ahead are five workers on the track who will die. You can steer onto a side track, where one worker will die instead.
*   **Poll Result:** The vast majority of students would turn the trolley, sacrificing one to save five.
*   **Reasons for turning (Majority):**
    *   It is not right to kill five people when you can kill only one.
    *   Analogy: 9/11 heroes who saved more lives by sacrificing others.
*   **Reasons for not turning (Minority):**
    *   This mentality could justify genocide or totalitarianism, implying a categorical objection to choosing who dies.

**2. The Trolley Problem (Variant 2: Onlooker and Fat Man)**
*   **Scenario:** You are an onlooker on a bridge. A trolley is hurtling towards five workers. Next to you is a very fat man. You can push him onto the tracks; he would die, but stop the trolley and save the five.
*   **Poll Result:** Most students would *not* push the fat man.
*   **Question:** What happened to the principle of sacrificing one to save five, which was widely accepted in the first case?
*   **Student Arguments for the Difference:**
    *   Pushing is an *active choice* involving someone not previously involved, unlike the worker already on the side track.
    *   The first case involves an uncontrollable runaway trolley requiring a split-second decision; pushing the fat man is an *actual act of murder*.
    *   It feels different to *personally push* someone to their death with your own hands versus steering a vehicle.
    *   In the first case, the driver is directly involved; in the second, the onlooker has a *choice of becoming involved or not* by pushing.

**3. Medical Dilemmas**
*   **Variant 1: ER Doctor**
    *   **Scenario:** You are an ER doctor with six patients from a wreck: five moderately injured, one severely. You can save the five (the one dies) or spend all day on the one (the five die).
    *   **Poll Result:** Most students would save the five.
*   **Variant 2: Transplant Surgeon**
    *   **Scenario:** You are a transplant surgeon with five dying patients needing different organs. A healthy person is in the next room for a check-up. You could take their organs, killing them but saving the five.
    *   **Poll Result:** Almost no one would do it.

**Emergence of Moral Principles**
*   **Consequentialist Moral Reasoning:**
    *   Locates morality in the *consequences* of an act – the state of the world that will result.
    *   The right thing to do depends on the outcomes (e.g., "better that five should live even if one must die").
    *   Exemplified by the majority's choice in the first trolley problem and the ER doctor scenario.
*   **Categorical Moral Reasoning:**
    *   Emerged when people hesitated in the fat man and organ transplant scenarios.
    *   Locates morality in *certain absolute moral requirements, duties, and rights*, regardless of consequences.
    *   Reflects the belief that some actions are intrinsically wrong (e.g., killing an innocent person), independent of the good they might produce.

**Philosophical Context**
*   **Utilitarianism:** The most influential example of consequentialist moral reasoning, invented by **Jeremy Bentham** (18th-century English political philosopher).
*   **Immanuel Kant:** The most important philosopher of categorical moral reasoning (18th-century German philosopher).
*   The course will explore the contrast between these two modes of moral reasoning.

**Course Design and Risks of Philosophical Inquiry**
*   The course will read works by philosophers such as **Aristotle, John Locke, Immanuel Kant, and John Stuart Mill**.
*   It will also debate *contemporary political and legal controversies* to connect abstract ideas to everyday life.
*   **Warning: Risks of self-knowledge**
    *   Philosophy *unsettles* by confronting us with what we already know, making the familiar strange. This process is irreversible, like "lost innocence."
    *   Moral and political philosophy is a story about *you*, but its destination is unknown.
*   **Political Risks**
    *   Political philosophy might initially make one a *worse citizen* (or at least worse before better) because it is a "distancing even debilitating activity."
    *   **Socrates** was warned by his friend **Callicles** (in Plato's *Gorgias*) that philosophy is "absolute ruin" if pursued too far, advising him to abandon argument for an active life. Callicles' point was that philosophy distances us from conventions and settled beliefs.
*   **Evasion: Skepticism**
    *   A common evasion is skepticism: since great philosophers haven't solved these questions, we can't either; therefore, it's just personal opinion.
    *   **Reply to Skepticism:** These questions are *unavoidable* because "we live some answer to these questions every day."
    *   **Immanuel Kant** noted that skepticism is a "resting place for human reason where it can reflect upon its dogmatic wanderings but it is no dwelling place for permanent settlement."
    *   The course aims to "awaken the restlessness of reason and to see where it might lead."

---

**Niet opruimen.** De samenvatting op de Justice-rij (transcript `0798fa30-…`) is de bron voor de `summary-overview`- en `summary-chapter`-captures — laat het transcript **en** zijn samenvatting staan, net als het geseede "Designing for Deep Work"-interview. Verdwijnt hij, regenereer via het product (Regenerate summary op die rij; ~6 credits) — model-uitvoer is niet deterministisch, dus hoofdstukindeling/tekst kunnen licht verschillen.
