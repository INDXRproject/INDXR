# AI-summary voorbeeld — Justice-lezing (bevroren fixture, 2026-08-25)

**Aard:** één **echte**, door het live product gegenereerde AI-samenvatting (ADR-090: overkoepelende samenvatting + hoofdstukken met klikbaar tijdstempel), vastgelegd zodat de cijfers én het voorbeeldfragment niet opnieuw verdwijnen. **Bevroren fixture** (2026-08-25): dit is de definitieve versie die de `summary-overview`/`summary-chapter`/`summary-edit`-captures leest — hij wordt niet meer opnieuw gegenereerd voor een proef of meting (zie [screenshot-machine.md](screenshot-machine.md) en de LESSONS-regel over fixtures die een schermafbeelding voeden). Bron voor het samenvatten-artikel.

**Keuze van transcript.** Gekozen: de geseede **Justice-lezing** (`kBdfcR-8hEY`, Harvard, transcript `0798fa30-8056-4343-9e02-c50d93c00e4a`). Reden: het is het **enige** geseede transcript met echte, substantiële, Engelstalige, neutrale, multi-hoofdstuk-inhoud **plus een videoId** (→ klikbare amber tijdstempels in de samenvatting). De andere "geseede" rijen (Feynman/MIT/Stanford/CS50/consciousness) zijn **3-woords display-stubs** (hun library-woordtelling is cosmetisch) en kunnen niet zinnig samengevat worden; de Dave-Chappelle-upload is 5:19 met wat ruw taalgebruik en heeft geen videoId; het "Designing for Deep Work"-seed-interview is 72 s / 213 woorden — te dun voor meerdere hoofdstukken. De trolley-problem-ethiek van de Justice-lezing is standaard, wereldwijd onderwezen lesmateriaal en neutraal genoeg voor een publieke pagina.

## Gemeten cijfers

| Meting | Waarde |
|---|---|
| Videoduur | **54:42** (3282 s) |
| Transcriptwoorden | **6.987** (1142 caption-segmenten, `youtube_captions`) |
| **Transcript-kosten** | **0 credits** — dit transcript komt uit **YouTube-captions**; caption-extractie is **gratis** (`SINGLE_VIDEO_AUTO_CAPTIONS = 0`). Dit is NIET de AI-transcriptieprijs (1 cr/min → 55 cr voor deze duur); dat pad is hier niet gebruikt. |
| Hoofdstukken | **5** |
| Samenvattingswoorden | **3.632** (overview 125 + hoofdstukken 3.507) |
| Verhouding samenvatting : transcript | **0,520** — de samenvatting is ~52% van het transcript (≈ 1 samenvattingswoord per 1,9 transcriptwoorden) |
| **Samenvatting-kosten** | **6 credits** (= `calculate_summary_cost(3282)` = 3 + ⌈(3282−1800)/600⌉, ADR-098 Add.2; was 5 onder de oude /20-min-formule). Dit is de **enige** kost van deze fixture — het transcript zelf was gratis. |
| Model / schema | `gemini-2.5-flash` (twee-staps, ADR-090) / schema_version 2 |

**Hoofdstukken (5 — kop + tijdspanne):**

1. Introduction to Moral Dilemmas and Reasoning — **[0:00 – 24:44]**
2. Revisiting Moral Frameworks and Introducing Utilitarianism — **[24:44 – 29:22]**
3. The Case of the Mignonette and Utilitarianism in Practice — **[29:22 – 34:54]**
4. Debating the Mignonette Case: Necessity, Consent, and Rights — **[34:54 – 50:12]**
5. Synthesizing Objections and Future Philosophical Inquiry — **[50:12 – 54:41]**

## Overkoepelende samenvatting (verbatim, 125 woorden)

This video introduces the field of moral philosophy by presenting a series of challenging ethical dilemmas, such as the classic trolley problem and variations involving doctors and organ transplants. These scenarios serve to illustrate two fundamental approaches to moral reasoning: consequentialist ethics, which judges actions based on their outcomes, and categorical ethics, which emphasizes inherent duties and rights irrespective of consequences. The lecture then delves into Jeremy Bentham's utilitarianism, a prominent consequentialist theory, and applies it to the real-life historical case of the Mignonette shipwreck, where sailors resorted to cannibalism for survival. Through a lively classroom debate, students grapple with questions of necessity, the role of consent, and the existence of absolute moral principles, setting the stage for deeper philosophical exploration of these complex issues.

## Hoofdstuk 1 (verbatim — kop + tijdstempel, 1.651 woorden)

### Introduction to Moral Dilemmas and Reasoning — [0:00]

The course begins with a story about **Justice**.

**The Trolley Problem (Variant 1: Driver)**
*   **Scenario:** You are the driver of a trolley car traveling at 60 mph. Your brakes fail. Ahead are five workers on the track. You will kill all five if you continue.
*   **Alternative:** There is a side track to the right with one worker. Your steering works, allowing you to turn onto the side track, killing the one worker but sparing the five.
*   **Dilemma:** What is the right thing to do? Turn, killing one to save five, or go straight, killing five?
*   **Class Poll:**
    *   Vast majority: Would turn the trolley car onto the side track.
    *   Minority: Would go straight ahead.

**Reasons for Choices:**
*   **Majority (would turn):**
    *   "It can't be right to kill five people when you can only kill one person instead."
    *   Analogy given: On 9/11, those who flew the plane into the Pennsylvania field are regarded as heroes because they chose to kill those on the plane rather than more people in big buildings.
    *   Underlying principle: "Better to kill one so that five can live."
*   **Minority (would not turn):**
    *   Reason: "That same type of mentality that justifies genocide and totalitarianism" (e.g., wiping out one race to save another). This implies not turning to avoid adopting such a principle.

**The Trolley Problem (Variant 2: Onlooker)**
*   **Scenario:** You are not the driver. You are an onlooker on a bridge overlooking the track. A trolley car is coming, its brakes fail, and it is about to crash into five workers on the track below.

**The "Fat Man on the Bridge" Dilemma (Trolley Problem Variation)**
*   **Scenario**: A trolley is heading towards five people. You are on a bridge above the tracks. Next to you is a very fat man. If you push him off the bridge onto the tracks, he will die, but he will stop the trolley and save the five.
*   **Audience Response**: Most people would *not* push the fat man.
*   **Question**: What happened to the principle of "better to save five lives even if it means sacrificing one" that was endorsed in the initial trolley case (where one could divert the trolley to kill one instead of five)?

**Student Explanations for the Difference in Moral Intuition**
1.  **Student 1 (Majority)**:
    *   Pushing the fat man involves an *active choice* to involve someone who would otherwise not be in the situation.
    *   In the first trolley case, the driver and workers are already "in this situation."
    *   **Counter-argument (Lecturer)**: The single worker on the track in the first case didn't choose to sacrifice his life either.
    *   **Student 1's Reply**: The worker was *on the tracks*; the fat man was *on the bridge*. (Suggests a distinction based on pre-existing involvement in the danger zone).

2.  **Student 2 (Reconciliation)**:
    *   In the first case, people die because of the *runaway trolley car*, not necessarily because of your *direct actions*. It's a split-second choice.
    *   Pushing the fat man is an *actual act of murder* where you have *control* over the situation, unlike the trolley. (Emphasizes direct agency and responsibility for the death).
    *   **Counter-argument (Lecturer)**: In both scenarios, you make a conscious choice: either to turn the trolley (an active conscious thought) or to push the fat man (an active conscious action). In either case, you are making a choice about who dies.

3.  **Student 3 (Andrew)**:
    *   Still "seems kind of different." *Actively pushing someone* with your own hands is different from *steering something* that will cause death. (Highlights physical directness of action).
    *   **Lecturer's Variation**: What if the fat man stood over a *trap door* you could open with a *steering wheel*?
    *   **Andrew's Response**: Still seems "more wrong." Maybe if you *accidentally leaned* into the wheel, or if the *trolley itself hit a switch* to drop the trap, it would be different. (Further underscores the aversion to direct, intentional physical action causing death).

4.  **Student 4 (Another Explanation)**:
    *   In the first situation, you are *directly involved*.
    *   In the fat man case, you are an *onlooker* and have the *choice of becoming involved or not* by pushing him. (Focuses on one's initial role and the decision to intervene directly).

The course introduces moral dilemmas through thought experiments:

1.  **Doctor's Dilemma (Emergency Room):**
    *   **Scenario:** You are an ER doctor. Six patients arrive after a trolley car wreck. Five have moderate injuries, one is severely injured.
    *   **Choice A:** Spend all day caring for the one severely injured person, leading to the death of the five moderately injured patients.
    *   **Choice B:** Look after the five moderately injured patients, restoring them to health, but the one severely injured person dies during that time.
    *   **Audience Response:** Most people choose to save the five, reasoning it's "one life versus five."

2.  **Doctor's Dilemma (Organ Transplant):**
    *   **Scenario:** You are a transplant surgeon. Five patients urgently need organ transplants (heart, lung, kidney, liver, pancreas) to survive, and there are no donors.
    *   **Dilemma:** A healthy person is in the next room for a checkup, taking a nap. You could quietly take their five organs, causing their death, but saving your five patients.
    *   **Audience Response:** Very few people would choose to do this, suggesting a reluctance to actively kill an innocent person, even to save five others. (A student's alternative suggestion to use organs from one of the dying five was noted but set aside for philosophical purposes).

These discussions reveal two emerging moral principles:

*   **Consequentialist Moral Reasoning:**
    *   This approach dictates that "the right thing to do, the moral thing to do, depends on the consequences that will result from your action."
    *   It suggests that the better outcome is when "five should live even if one must die."
    *   Consequentialist moral reasoning "locates morality in the consequences of an act," focusing on "the state of the world that will result from the thing you do."

*   **Categorical Moral Reasoning (implied):**
    *   When faced with dilemmas like the organ transplant, people hesitate, considering "the intrinsic quality of the act itself," regardless of consequences.
    *   There is a feeling that it is "just wrong, categorically wrong, to kill," which points to moral principles based on duties or rights inherent in actions, rather than solely on their outcomes.

**Categorical Moral Reasoning**
*   Locates morality in absolute moral requirements, categorical duties, and rights, regardless of consequences.
*   Explored in contrast with consequentialist moral principles.
*   The most important philosopher of categorical moral reasoning is the *18th-century German philosopher Emmanuel Kant*.

**Consequentialist Moral Reasoning**
*   The most influential example is **utilitarianism**.
*   A doctrine invented by *Jeremy Bentham*, the 18th-century English political philosopher.

**Course Content and Structure**
*   The course will explore the contrast between consequentialist and categorical moral principles, assessing them and considering others.
*   It involves reading great and famous books by philosophers such as *Aristotle, John Locke, Emmanuel Kant, and John Stuart Mill*.
*   It also examines contemporary political and legal controversies that raise philosophical questions.
*   Topics for debate include: equality and inequality, affirmative action, free speech versus hate speech, same-sex marriage, and military conscription.
*   The purpose is not just to enliven abstract books, but to clarify what is at stake in everyday and political lives for philosophy, showing how books and issues inform each other.

**Warning: Personal Risks of Philosophical Inquiry**
*   Reading these philosophical texts and engaging in this exercise of self-knowledge carries certain risks, both personal and political.
*   Philosophy teaches and unsettles us by confronting us with what we already know.
*   The difficulty of the course lies in its ability to take what is known from familiar, unquestioned settings and make it strange.
*   This process (like the initial hypothetical dilemmas) works by estranging us from the familiar, not by supplying new information, but by provoking a new way of seeing.
*   The risk is that once the familiar turns strange, it is "never quite the same again."
*   Self-knowledge is described as being "like lost innocence"; once discovered, it "can never be unthought or unknown," however unsettling it may be.
*   Moral and political philosophy is a story about *you*, and while the destination is unknown, this personal involvement makes the enterprise difficult but riveting.

Political philosophy, contrary to common assumptions, may not immediately make one a better citizen. It might first make you a "worse citizen" because philosophy is a "distancing" and "debilitating activity."

This risk is illustrated by Calicles' warning to Socrates in Plato's *Gorgias*. Calicles advised Socrates that philosophy, if pursued beyond moderation, is "absolute ruin." He urged Socrates to abandon argument and embrace the accomplishments of active life, taking as models those with a good livelihood and reputation, rather than philosophers engaged in "petty quibbles." Calicles' point was that philosophy distances individuals from conventions, established assumptions, and settled beliefs, posing both personal and political risks.

In the face of these risks, there's a common evasion called skepticism. This view suggests that since philosophers like Aristotle, Locke, Kant, and Mill haven't definitively resolved fundamental questions over centuries, it's futile for students to expect to do so in a semester. Therefore, skeptics conclude that moral principles are simply a matter of individual opinion, with no universal way of reasoning.

However, this evasion of skepticism is flawed. The persistent recurrence of these questions indicates that while they may be impossible to resolve "once and for all" in one sense, they are "unavoidable" in another. This is because "we live some answer to these questions every day."

As Emanuel Kant noted, skepticism is a "resting place for human reason where it can reflect upon its dogmatic wanderings, but it is no dwelling place for permanent settlement." Simply acquiescing to skepticism cannot overcome "the restlessness of reason." The aim of engaging with these topics is to awaken this "restlessness of reason" and explore where it leads.

---

**Niet opruimen — BEVROREN.** De samenvatting op de Justice-rij (transcript `0798fa30-…`) is de bron voor de `summary-overview`/`summary-chapter`/`summary-edit`-captures — laat het transcript **en** zijn samenvatting staan, net als het geseede "Designing for Deep Work"-interview. Regenereer hem **niet** voor een proef of meting (dat verouderde deze cijfers + captures al drie keer — zie de LESSONS-regel). Moet hij ooit terug, dan kost een `Regenerate summary` op die rij **6 credits** (`calculate_summary_cost(3282)`) en is de model-uitvoer niet deterministisch — hoofdstukindeling/tekst kunnen dan afwijken van de cijfers hierboven, dus opnieuw meten + captures opnieuw schieten.
