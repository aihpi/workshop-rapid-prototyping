# Rapid Prototyping via Vibe Coding, Teil 1

## Header

- Level: single
- Mode: full
- Format: slides
- Language: de
- Slot: 180 Minuten, 16.11.2026
- Setting: vor Ort am HPI, etwa 20 Teilnehmende, eigene Laptops
- Template: AISC Light
- Quiz: none
- Inspiration: ~/Downloads/slides_part1.pptx (früherer Entwurf, 25 Folien; nur einzelne Ideen übernommen)
- Learner: Eine Person ohne Programmiererfahrung, die Chatbots aus dem Alltag kennt, noch nie Software gebaut hat und wissen will, ob sie eine eigene Idee selbst umsetzen kann.
- Key message: Mit Vibe Coding entsteht in Minuten ein lauffähiger Prototyp, aber sobald er wachsen soll, entscheidet die Architektur, und die bleibt Aufgabe des Menschen.
- Goals: G1 Verstehen & Einordnen (1): Rapid Prototyping in eigenen Worten erklären und von einem Produkt abgrenzen (z.B. Zweck, Lebensdauer, Zahl der Nutzenden); G2 Anwenden (2): mit einem Chatbot unter Anleitung eine lauffähige Browser-Anwendung als einzelne HTML-Datei erzeugen und schrittweise erweitern (z.B. eine Drum Machine); G3 Anwenden (2): einen vagen Wunsch in einen eindeutigen Prompt mit Details umformulieren (z.B. mit den fünf Fragen oder dem Interview-Trick); G4 Analysieren & Bewerten (2): an einem gegebenen Beispiel einschätzen, wo ein Prototyp an Grenzen kommt (z.B. eigene Uhr pro Datei bei Toms Instrumenten); G5 Analysieren & Bewerten (2): die Ergebnisse verschiedener Chatbots zum selben Prompt vergleichen (z.B. Umfang, Bedienung, Fehler); G6 Kommunizieren (2): einer fachfremden Person begründen, warum die Architektur eine Entscheidung des Menschen bleibt (z.B. mit dem Bild vom Orchester ohne Dirigentin)
- Final destination: ein eigenes Instrument als HTML-Datei auf dem eigenen Laptop und die Prompts 0 bis 4, mit denen es sich zu Hause mit jedem Chatbot erweitern lässt
- Transfer value: Am ersten Arbeitstag danach baut die Person ein kleines Werkzeug für die eigene Arbeit und erkennt, wann sie eine Entwicklerin oder einen Entwickler fragen muss. Der Moment dafür ist die Frage auf Folie 18 und ihre Auflösung auf Folie 19.
- Pre-communication: eine Woche vorher Ablauf, die drei Ergebnisse und "Laptop mit aktuellem Browser mitbringen. Gemini und ChatGPT lassen sich ohne Konto nutzen; wer Claude oder Mistral nutzen will, braucht ein Konto"; keine Installationsanleitung
- Status log:
  - 2026-11-16 plan written
  - 2026-11-16 audience, plan check, complete (10 Fragen, Verständnisbruch bei der Folie zum Vier-Sekunden-Trick)
  - 2026-11-16 presenter, check full, complete (erste Fassung 194 Minuten, 108 % des Slots; vier Fragen ohne Antwort im Material)
  - 2026-11-16 plan revised after both reviews (Übung auf drei Schritte gekürzt, zwei Trick-Folien zusammengelegt, Folie zum Zusammenspiel und Mitmach-Folie 26 ergänzt; neue Summe der Agenda 180 Minuten)
  - 2026-11-16 plan panel round 1: Datum gesetzt, Link zum Repository auf Folie 2, Vorführung nur als Bonus, eigener Chatbot als Ausweg auf Folie 11
  - 2026-11-16 approved by Hanno Müller (plan panel "Go")
  - 2026-11-16 creator, build, complete (46 Folien, pptx und pdf; Foto auf Folie 41 fehlt, Platzhalter)
  - 2026-11-16 audience, deck check, complete (10 Fragen; Brüche bei Folie 11, 17 bis 19 und 32; elf Folien mit zu kleinem Text)
  - 2026-11-16 presenter, check full, complete (193,5 Minuten, 107,5 % des Slots; Überhang in der Übung und bei Prompt 0)
  - 2026-11-16 plan revised after the deck review, confirmed by Hanno Müller ("Yes for all of it"): Übung mit Prompt 1 und 2, Prompt 4 für Schnelle, Agenda neu verteilt (Summe 180), Begriffe und Schriftgrößen
  - 2026-11-16 creator, rebuild, complete (46 Folien, pptx und pdf neu; Foto auf Folie 41 fehlt weiter)

# Slide 1
## Title: Rapid Prototyping via Vibe Coding
## Content:
Workshop, Teil 1
Hanno Müller
KI-Servicezentrum Berlin-Brandenburg am HPI
16.11.2026

# Slide 2
## Title: Bevor wir beginnen
## Content:
- Anwesenheitsliste bitte weitergeben
- Material zum Abschreiben: github.com/aihpi/workshop-rapid-prototyping, Ordner 03_workshop/01_workshop
- Fragen jederzeit

# Slide 3
## Title: Wir senken Barrieren für den Einsatz von KI
## Content:
KI-Servicezentrum Berlin-Brandenburg am HPI
Drei Karten in einer Reihe, je ein Wort: Bildung, Beratung, Infrastruktur
Kostenlos für Wirtschaft, Verwaltung und Gesellschaft
hpi.de/kisz

# Slide 4
## Title: Ablauf heute
## Content:
Tabelle mit rechtsbündigen Minuten und Summe:
- Begrüßung und Ziel, 8
- 1 Was ist Rapid Prototyping?, 10
- Prompt 0: ein Satz, ein Instrument, 25
- Was habt Ihr bekommen?, 7
- 2 Wo Prototypen tragen und wo nicht, 20
- 3 Gut prompten, 20
- Pause, 15
- 4 Übung: Dein Instrument in zwei Schritten, 50
- 5 Diskussion, 18
- Abschluss, 7
- Summe, 180

# Slide 5
## Title: Das nehmt Ihr heute mit
## Content:
Drei nummerierte Karten:
- 1 Ein eigenes Instrument. Eine Datei, die im Browser spielt
- 2 Die Prompts 0 bis 4. Zum Weiterbauen zu Hause, mit jedem Chatbot
- 3 Ein Gespür für die Grenze. Wann ein Prototyp reicht und wann nicht

# Slide 6
## Title: Was ist Rapid Prototyping?
## Content:
Teil 1 von 5

# Slide 7
## Title: Wer sitzt im Raum?
## Content:
Handzeichen:
- Wer hat schon einmal programmiert?
- Wer nutzt regelmäßig einen Chatbot?
Gelber Kasten: Was würdet Ihr gern bauen, wenn Ihr es könntet? Drei Stimmen aus dem Raum.

# Slide 8
## Title: Rapid Prototyping heißt: schnell etwas zum Anfassen bauen
## Content:
Kreislauf aus vier Kästen mit Pfeilen: Idee, Prototyp, Ausprobieren, Lernen, und zurück zur Idee
Gelber Kasten: Das Ziel ist nicht das fertige Produkt. Das Ziel ist die Antwort auf die Frage, ob die Idee trägt.

# Slide 9
## Title: Ein Prototyp ist kein Produkt
## Content:
Vergleichstabelle mit den Spalten Prototyp und Produkt:
- Zweck: lernen, ob die Idee trägt / täglich benutzt werden
- Lebensdauer: Tage / Jahre
- Nutzende: ich selbst / viele
- Fehler: erlaubt / teuer
- Wer kennt das Innenleben: niemand muss / ein Team muss

# Slide 10
## Title: Vibe Coding: Du beschreibst, die KI baut
## Content:
Drei Karten:
- Beschreiben. Du schreibst dem Chatbot in eigenen Worten, was die Software tun soll. Diese Anweisung heißt Prompt
- Ausprobieren. Die Antwort ist Code: ein langer Text, den Du als HTML-Datei speicherst. Eine HTML-Datei ist eine Webseite, die Dein Browser öffnet
- Nachbessern. Änderungen wieder in eigenen Worten beschreiben

# Slide 11
## Title: Prompt 0: ein Satz, ein Instrument
## Content:
Vier nummerierte Kästen mit Pfeilen:
- 1 Chatbot öffnen. Nimm einen anderen als die Person neben Dir, damit wir später vergleichen können: Gemini, ChatGPT oder Claude
- 2 Diesen Satz senden
- 3 Den Code aus der Antwort in einen Texteditor kopieren (Windows: Editor, Mac: TextEdit) und als drum.html speichern
- 4 Datei doppelklicken, auf die Seite klicken, Play drücken
Gelber Kasten: Baue mir eine Drum Machine als einzelne, eigenständige HTML-Datei.
Grauer Textblock: Verlangt ein Chatbot ein Konto, nimm den, den Du sonst nutzt. Öffnet sich ein Texteditor statt des Browsers: Rechtsklick auf die Datei, "Öffnen mit", Browser wählen. 25 Minuten.

# Slide 12
## Title: Was habt Ihr bekommen?
## Content:
Vergleicht mit der Person neben Euch:
- Was ist gleich?
- Was ist anders?
- Was fehlt, das Ihr erwartet hättet?
Gelber Kasten: Derselbe Satz, zwanzig verschiedene Instrumente. Alles, was Ihr nicht gesagt habt, hat die KI entschieden.

# Slide 13
## Title: Wo Prototypen tragen und wo nicht
## Content:
Teil 2 von 5

# Slide 14
## Title: Dafür eignet sich Vibe Coding
## Content:
Vier Karten:
- Kleine Werkzeuge. Rechner, Formulare, Checklisten für eine Person
- Daten sichtbar machen. Eine Tabelle auswerten, ein Diagramm zeichnen
- Ideen prüfen. In einer Stunde sehen, ob etwas funktioniert
- Abläufe vereinfachen. Vorlagen und Textbausteine erzeugen

# Slide 15
## Title: Ein Musiker baut Instrumente für seinen Unterricht
## Content:
Tom Tiest, Musiker und Dozent an der PLX
- Keine Ausbildung in Softwareentwicklung
- Acht Instrumente, jedes eine HTML-Datei, jedes mit einem Chatbot gebaut
- Seine Studierenden lernen damit KI und digitale Musikproduktion
Drei Bildschirmfotos nebeneinander: Beat Machine, Synth Machine, Mix Console
iamarabbit.com

# Slide 16
## Title: Die Instrumente sollen zusammen spielen
## Content:
Schaubild: zwei Browserfenster nebeneinander, links "Schlagzeug", rechts "Bass", darunter je eine Reihe aus 16 Kästchen
- Jedes Instrument spielt ein Muster aus 16 Schritten in einer Schleife. Das nennt man Sequencer
- Wie in einer Band müssen beide im selben Moment mit Schritt 1 beginnen
Gelber Kasten: Zwei Fenster wissen nichts voneinander. Wie beginnen sie gleichzeitig?

# Slide 17
## Title: Sein Trick: Start nur bei einem Vielfachen von vier Sekunden
## Content:
Zeitstrahl der Uhr des Computers mit Marken bei 0, 4, 8 und 12 Sekunden. Zwei Fenster werden zu verschiedenen Zeiten gestartet und setzen beide an derselben Marke ein. Die gemeinsame Marke ist rot gefüllt.
Grauer Textblock: Aus seinem Prompt, übersetzt aus dem Niederländischen: "Kannst du dafür sorgen, dass der Sequencer immer in dem Moment beginnt, in dem die Sekunden der Computerzeit ein Vielfaches von 4 sind?"

# Slide 18
## Title: Zwei Fenster, ein Takt
## Content:
Zwei Bildschirmfotos nebeneinander: Beat Machine und Synth Machine, beide gestartet, beide bei Tempo 120
Gelber Kasten: Was passiert, wenn Tom in einem Fenster das Tempo ändert, also wie schnell das Muster läuft? Handzeichen: bleibt im Takt oder läuft auseinander?

# Slide 19
## Title: Jede Datei hat ihre eigene Uhr
## Content:
Schaubild: acht Kästen in einer Reihe, jeder mit einem eigenen Uhrsymbol. Darüber eine gestrichelte Linie mit der Beschriftung "gemeinsam ist nur der Startzeitpunkt".
- Die Uhr des Computers gibt nur den Startmoment vor. Danach zählt jede Datei ihre Schritte selbst
- Sie laufen auseinander: Das andere Fenster erfährt nichts von der Änderung
Gelber Kasten: Wie ein Orchester ohne Dirigentin. Alle setzen gleichzeitig ein, danach hört niemand auf die anderen.

# Slide 20
## Title: Acht Dateien, vieles mehrfach gebaut
## Content:
Tabelle mit den Spalten "Baustein" und "Wie oft gebaut":
- Schrittfolge (Sequencer), 4 mal, jedes Mal anders
- Hall (Nachhall wie in einer Kirche), 4 mal, jedes Mal anders
- Start im Takt, 3 Fassungen
- Muster speichern, in keiner Datei
Grauer Textblock: Wer den Hall verbessern will, muss vier Dateien ändern. Wer die Seite neu lädt, verliert sein Muster.

# Slide 21
## Title: Zwei Grenzen, die der Fall zeigt
## Content:
Zwei Karten mit farbigem linken Rand:
- Schwer zu pflegen. Jede Verbesserung muss in mehrere Dateien. Niemand hat den Code gelesen
- Wächst schlecht. Jedes neue Instrument bringt wieder seine eigene Uhr und seinen eigenen Hall mit

# Slide 22
## Title: Was fehlt, ist Architektur
## Content:
Zwei Schaubilder nebeneinander. Links: acht Dateien, acht Uhren. Rechts: eine Anwendung mit acht Instrumenten und einer Uhr, die Uhr rot gefüllt.
Grauer Textblock: Architektur heißt: entscheiden, aus welchen Teilen etwas besteht und was die Teile sich teilen.
Gelber Kasten: Kein Prompt hat nach einer gemeinsamen Uhr gefragt. Also hat niemand sie entschieden.

# Slide 23
## Title: Gut prompten
## Content:
Teil 3 von 5

# Slide 24
## Title: Eindeutig formulieren
## Content:
Zwei Karten nebeneinander mit farbigem linken Rand:
- Vage. "Mach mir eine App für Aufgaben." Welche Aufgaben? Mit Terminen? Wo gespeichert?
- Eindeutig. "Eine To-do-Liste als einzelne HTML-Datei. Hinzufügen mit Enter, abhaken per Klick, löschen per Doppelklick. Gespeichert im Browser."
Gelber Kasten: Lässt sich ein Satz auf zwei Arten lesen, wählt die KI eine davon.

# Slide 25
## Title: Details beschreiben: fünf Fragen
## Content:
Tabelle mit den Spalten "Frage" und "Antwort im Prompt":
- Was soll es tun? / Aufgaben hinzufügen, abhaken, löschen
- Wie viele? / 16 Schritte, 3 Kanäle, 3 Klänge pro Kanal (aus Toms Prompt)
- Womit bediene ich es? / Enter, Klick, Doppelklick
- Wohin mit den Daten? / gespeichert im Browser
- In welchem Format? / eine einzelne HTML-Datei

# Slide 26
## Title: Jetzt Ihr: Prompt 0 mit Details
## Content:
Schreibt den Satz von vorhin zu zweit neu und beantwortet drei der fünf Fragen.
Gelber Kasten: Baue mir eine Drum Machine als einzelne, eigenständige HTML-Datei.
Noch nicht senden. 4 Minuten, dann zwei Beispiele aus dem Raum. Wer mag, sendet ihn in der Übung statt Prompt 1.

# Slide 27
## Title: Die Architektur entscheidest Du
## Content:
Tabelle mit drei Spalten "Frage vor dem ersten Prompt", "Toms Instrumente", "Vorratsliste für Kaffeebohnen":
- Welche Teile gibt es? / acht Instrumente / Vorrat, Einkaufsliste
- Was teilen sich die Teile? / die Uhr / die Liste der Sorten
- Wo liegen die Daten? / nirgends, nichts wird gespeichert / im Browser

# Slide 28
## Title: Ein Feature nach dem anderen
## Content:
Zeitstrahl mit vier Kreisen: Grundgerüst, Klang, eigenes Feature, Presets. Unter jedem Kreis "ausprobieren, sichern".
- Nach jedem Schritt die Datei unter neuem Namen sichern: drum1.html, drum2.html
- Geht etwas kaputt, zurück zur letzten Fassung

# Slide 29
## Title: Trick: Lass die KI fragen
## Content:
Zwei Karten:
- Du kennst Dein Ziel. Die KI schreibt daraus einen genauen Prompt für einen neuen Chat
- Du kennst Dein Ziel noch nicht genau. Die KI stellt Dir Fragen, bis es klar ist, und schreibt erst dann den Prompt
Gelber Kasten: "Schreib keinen Code in diesem Gespräch. Stelle mir Fragen, bis Du genug weißt, und gib mir dann einen Prompt für einen neuen Chat."
Grauer Textblock: Im neuen Chat beginnt die KI ohne das alte Gespräch.

# Slide 30
## Title: Pause
## Content:
15 Minuten

# Slide 31
## Title: Übung
## Content:
Teil 4 von 5

# Slide 32
## Title: Dein Instrument in zwei Schritten
## Content:
Zwei große Karten nebeneinander:
- Prompt 1 Drum Machine. 01_beat_machine_prompt.txt
- Prompt 2 Klang formen. 02_sound_design_prompt.txt
Grauer Textblock: Die Dateien liegen im Ordner 03_workshop/01_workshop. Für Prompt 2: Deine HTML-Datei im Texteditor öffnen, alles markieren, kopieren und unter den Prompt einfügen. 50 Minuten.

# Slide 33
## Title: Wenn etwas hakt
## Content:
Tabelle mit den Spalten "Problem" und "Lösung":
- Kein Ton / erst auf die Seite klicken, dann Play
- Der Chatbot hört mitten im Code auf / "Bitte gib mir die ganze Datei noch einmal" senden
- Der Chatbot weigert sich oder antwortet ohne Code / neuen Chat öffnen, Prompt erneut senden
- Die Datei öffnet sich im Texteditor / Rechtsklick auf die Datei, "Öffnen mit", Browser wählen
- Nach einer Änderung geht nichts mehr / zurück zur letzten gesicherten Fassung

# Slide 34
## Title: Für Schnelle: eigenes Feature oder eigener Prototyp
## Content:
Drei nummerierte Karten:
- 1 Prompt 4 nehmen. 04_feature_prompt.txt, die KI interviewt Dich zu Deinem Feature
- 2 Oder eine eigene Idee wählen. Das, was Du am Anfang gern bauen wolltest
- 3 Architektur klären, dann bauen. Die drei Fragen von Folie 27

# Slide 35
## Title: Diskussion
## Content:
Teil 5 von 5

# Slide 36
## Title: Was lief gut, wo hakte es?
## Content:
Zwei Fragekarten:
- Was hat auf Anhieb funktioniert?
- Wo musstet Ihr nachfragen oder neu anfangen?
Ein Satz pro Person reicht.

# Slide 37
## Title: Wo kam Euer Prototyp an Grenzen?
## Content:
Zwei Fragekarten:
- Was würdet Ihr dieser Datei nicht anvertrauen?
- Was müsste jemand entscheiden, bevor daraus ein Produkt wird?

# Slide 38
## Title: Derselbe Prompt, verschiedene Chatbots
## Content:
Handzeichen: Wer hat Gemini benutzt, wer ChatGPT, wer Claude?
- Was fiel im Vergleich mit der Person neben Euch auf?
Drei Bildschirmfotos nebeneinander als Vergleich: die Drum Machine aus Prompt 1 von Claude, Gemini und ChatGPT

# Slide 39
## Title: Der Prototyp entsteht in Minuten, die Architektur bleibt Deine Aufgabe
## Content:
Zwei Karten:
- Heute gebaut. Ein Instrument, das spielt, in weniger als einer Stunde
- Heute gesehen. Acht Instrumente ohne gemeinsame Uhr

# Slide 40
## Title: Wie es weitergeht
## Content:
Drei Karten:
- Zu Hause. Mit Prompt 3 und Prompt 4 weiterbauen
- Teil 2 der Reihe. Vom Prototyp zur Anwendung, mit einem KI-Assistenten, der im Projekt mitarbeitet
- KI-Beratungsstunde. Kostenlos, für Eure eigene Idee

# Slide 41
## Title: Vielen Dank
## Content:
Sprecherkarte: Foto, Hanno Müller, KI-Servicezentrum Berlin-Brandenburg am HPI
kisz@hpi.de
hpi.de/kisz

# Appendix

# Slide 42
## Title: Anhang
## Content:
Hintergrund für Fragen, nicht Teil des Hauptpfads

# Slide 43
## Title: Warum die Fenster auseinanderlaufen
## Content:
- Die vier Sekunden legen nur den Start fest. Danach läuft jede Datei mit ihrer eigenen Uhr
- Ein Durchlauf mit 16 Schritten dauert 240 geteilt durch das Tempo (Schläge pro Minute) in Sekunden
- Bei Tempo 120 dauert er 2 Sekunden und passt genau in das Raster von 4 Sekunden
- Bei Tempo 100 dauert er 2,4 Sekunden. Ein Fenster, das 4 Sekunden später startet, liegt 1,6 Sekunden daneben

# Slide 44
## Title: Weitere Grenzen von Prototypen
## Content:
Zwei Karten:
- Ungewöhnliche Eingaben. Die KI probiert ihren Code nicht aus. Was beim ersten Versuch klappt, kann bei seltenen Eingaben still versagen
- Sicherheit und Datenschutz. Wer nichts vorgibt, überlässt diese Entscheidungen der KI

# Slide 45
## Title: Wann einfach anfangen, wann erst planen?
## Content:
Zwei Karten:
- Einfach anfangen. Wegwerfprototyp, läuft nur bei Dir, Anforderungen noch offen
- Erst planen. Soll länger leben, andere arbeiten daran, enthält fremde Daten oder Zahlungen

# Slide 46
## Title: Das KI-Servicezentrum im Detail
## Content:
Drei Karten:
- Bildung. Workshops, Gastvorträge auf tele-task.de, Kurse auf open.hpi.de
- Beratung. KI-Beratungsstunde auf Anfrage, Pilotprojekte mit Bewerbung alle drei Monate
- Infrastruktur. Kostenlos nutzbar, kein Produktionsbetrieb, Ergebnisse werden veröffentlicht

# Notes

- Anrede: "Du" für die einzelne Person, "Ihr" für den Raum.
- Die Folien nennen die Anwendung RABBIT Studio nicht und zeigen sie nicht. Folie 22 zeigt das Prinzip "eine Anwendung, eine Uhr" nur als allgemeines Schaubild ohne Namen. Die Bildschirmfotos auf Folie 15 zeigen Toms Originaldateien; der Schriftzug RABBIT darin ist sein eigener.
- Tom Tiest, PLX und iamarabbit.com dürfen genannt werden; Bildschirmfotos seiner Instrumente sind erlaubt (Hanno Müller, 2026-11-16). Kein Foto von Tom Tiest.
- Bildschirmfotos für Folie 15 aus RABBIT-BeatMachine_x.html, RABBIT-SynthMachine1_Full.html und RBBT-MixConsole1_Full.html in tmp/IntroPakket.zip. Bildschirmfotos für Folie 38 aus 03_workshop/01_workshop/claude/claude-01_beat_machine.html, gemini/gemini-01_beat_machine.html und gpt/gpt-01_beat_machine.html.
- Prompt 0 auf Folie 11 und Folie 26 ist der Inhalt von 03_workshop/01_workshop/00_beat_machine_prompt.txt, ins Deutsche übersetzt. Die Zählung "Prompt 0" bis "Prompt 4" folgt den Dateinamen.
- In der Übung laufen die Prompts 1 und 2. Prompt 4 ist die Aufgabe für Schnelle auf Folie 34; Prompt 3 und Prompt 4 sind Aufgabe für zu Hause. So passt die Übung mit Puffer in 50 Minuten.
- Lesbarkeit: Auf den Folien 4, 10, 11, 17, 19, 20, 22, 28, 32, 33 und 40 den Text größer setzen, sodass er aus der letzten Reihe lesbar ist (Fließtext mindestens 16 pt, Tabellen mindestens 14 pt). Auf Folie 22 steht die Definition von Architektur in normaler Textgröße, nicht als kleine graue Zeile. Auf Folie 38 nehmen die drei Bildschirmfotos die ganze Folienbreite ein.
- Die Zahlen auf Folie 20 und Folie 43 stammen aus einer Analyse des Quelltexts der acht Dateien, nicht aus einer Messung.
- Bonus, nur wenn Zeit bleibt: Nach Folie 18 die beiden Instrumente live in zwei Browserfenstern starten und in einem das Tempo ändern. Die Folien funktionieren ohne diese Vorführung. Die Bildschirmfotos auf Folie 18 stammen aus denselben zwei Dateien wie auf Folie 15.
- Der Link auf Folie 2 führt in ein Repository, das heute privat ist.
- Folie 3 fasst die vier Folien des früheren Entwurfs über das KI-Servicezentrum zusammen; die Einzelheiten stehen auf Folie 46.
- Eine Sekundärfarbe für das ganze Deck: Blau. Trennfolien (6, 13, 23, 31, 35, 42) vollflächig in Blau, mit der Zeile "Teil n von 5" als Standortanzeige.
- Folie 7 sammelt die Erwartungen ("Was würdet Ihr gern bauen?"). Folie 34 und Folie 40 greifen sie wieder auf.
- Die PDF-Datei ist ein Export der fertigen pptx-Datei mit demselben Namen.

# Planning detail

- Slide 1: beat destination; main idea Titel und Sprecher; visual none; checkpoint none
- Slide 2: beat destination; main idea Organisatorisches und Link zum Material; visual none; checkpoint Haben alle den Link notiert?
- Slide 3: beat destination; main idea wer einlädt; visual drei Karten; checkpoint none
- Slide 4: beat route; main idea der Ablauf mit Minuten; visual Tabelle; checkpoint Sind wir uns über den Weg einig?
- Slide 5: beat destination; main idea die drei Ergebnisse; visual drei Karten; checkpoint Sind wir uns über das Ziel einig?
- Slide 6: divider
- Slide 7: beat first easy step; main idea Check-in und Erwartungen; visual none; checkpoint Handzeichen und drei Stimmen
- Slide 8: beat route; main idea Rapid Prototyping als Lernschleife (G1); anchor Visual; checkpoint Was will man mit einem Prototyp herausfinden?
- Slide 9: beat route; main idea Prototyp gegen Produkt (G1); anchor Visual (Tabelle); checkpoint Was davon trifft auf eine Tabelle zu, die Ihr nur selbst benutzt?
- Slide 10: beat route; main idea Vibe Coding als Weg zum Prototyp, mit den Begriffen Prompt und HTML-Datei; visual drei Karten; checkpoint none
- Slide 11: beat first easy step; Kolb do; main idea ein Satz reicht für ein laufendes Instrument (G2); anchor Case; variants keine, alle senden denselben Satz; checkpoint Hat jede Person einen Ton gehört?
- Slide 12: beat first easy step; Kolb reflect; main idea Was nicht gesagt wird, entscheidet die KI (G3, G5); anchor Surprise (derselbe Satz, verschiedene Ergebnisse, verschiedene Chatbots); checkpoint Paargespräch, zwei Stimmen aus dem Raum
- Slide 13: divider
- Slide 14: beat next steps; main idea wofür es trägt; visual vier Karten; checkpoint none
- Slide 15: beat next steps; main idea ein echter Fall ohne Softwareausbildung; anchor Case; checkpoint none
- Slide 16: beat next steps; main idea mehrere Instrumente müssen gemeinsam beginnen, Begriff Sequencer; anchor Analogy (Band); checkpoint Wie beginnen zwei Fenster gleichzeitig?
- Slide 17: beat next steps; main idea der Start bei Vielfachen von vier Sekunden; anchor Visual (Zeitstrahl); checkpoint Sind alle noch dabei?
- Slide 18: beat next steps; Kolb reflect; main idea Vorhersage vor der Auflösung, Vorführung nur als Bonus (G4); anchor Surprise (predict then reveal); checkpoint Handzeichen: bleibt im Takt oder läuft auseinander?
- Slide 19: beat next steps; Kolb conceptualise; main idea jede Datei hat eine eigene Uhr (G4, G6); anchor Analogy (Orchester ohne Dirigentin; die Analogie endet dort, wo Musikerinnen einander hören können, die Fenster können das nicht); checkpoint Was genau teilen sich die Fenster?
- Slide 20: beat next steps; main idea getrennte Dateien führen zu Wiederholung und fehlendem Speichern (G4); anchor Visual (Tabelle); checkpoint none
- Slide 21: beat next steps; main idea schwer zu pflegen und wächst schlecht, belegt am Fall (G4); visual zwei Karten; checkpoint Welche der beiden Grenzen habt Ihr bei Prompt 0 schon gespürt?
- Slide 22: beat almost there; main idea Architektur ist die Entscheidung, die niemand getroffen hat (G6); anchor Visual; checkpoint Wer hätte die Uhr entscheiden müssen?
- Slide 23: divider
- Slide 24: beat next steps; Kolb conceptualise; main idea Mehrdeutigkeit vermeiden (G3); anchor Case (To-do-Liste); checkpoint none
- Slide 25: beat next steps; main idea fünf Fragen für die Details (G3); anchor Visual (Tabelle); checkpoint Welche der fünf Fragen hat Euer Satz von vorhin beantwortet?
- Slide 26: beat next steps; Kolb apply; main idea den eigenen Satz mit Details neu schreiben (G3); anchor Peer exercise; checkpoint zwei Beispiele aus dem Raum
- Slide 27: beat next steps; main idea drei Architekturfragen vor dem ersten Prompt, mit einem Beispiel ohne Musik (G6); anchor Case (Kaffeebohnen); checkpoint none
- Slide 28: beat next steps; main idea ein Feature pro Schritt, jede Fassung sichern (G2); anchor Visual (Zeitstrahl); checkpoint none
- Slide 29: beat next steps; main idea die KI fragen lassen, wenn die drei Fragen offen sind (G3); visual zwei Karten; checkpoint Wann nehmt Ihr welche Karte?
- Slide 30: break
- Slide 31: divider
- Slide 32: beat next steps; Kolb apply; main idea die Übung in zwei Schritten (G2, G3); anchor Case; variants Einsteigende folgen den zwei Prompts, Fortgeschrittene nehmen Folie 34; checkpoint Hat jede Person nach 20 Minuten Schritt 1 laufen?
- Slide 33: beat next steps; main idea Hilfe bei den häufigsten Problemen; visual Tabelle; checkpoint none
- Slide 34: beat next steps; Kolb apply; main idea die fortgeschrittene Variante mit Prompt 4 oder eigener Idee (G2, G3, G6); visual drei Karten; checkpoint none
- Slide 35: divider
- Slide 36: beat almost there; Kolb reflect; main idea Erfahrungen sammeln; visual zwei Fragekarten; checkpoint ein Satz pro Person
- Slide 37: beat almost there; main idea die Grenze am eigenen Prototyp benennen (G4); visual zwei Fragekarten; checkpoint zwei Stimmen aus dem Raum, höchstens 5 Minuten
- Slide 38: beat almost there; main idea verschiedene Chatbots, verschiedene Ergebnisse, belegt mit den Ergebnissen aus dem Raum (G5); anchor Visual (drei Bildschirmfotos); checkpoint Handzeichen je Chatbot
- Slide 39: beat arrived; main idea der Merksatz; visual zwei Karten; checkpoint Könnt Ihr den Satz jemandem zu Hause erklären?
- Slide 40: beat arrived; main idea nächste Schritte, greift die Wünsche von Folie 7 auf; visual drei Karten; checkpoint none
- Slide 41: beat arrived; main idea Kontakt; visual Sprecherkarte; checkpoint none
- Slide 42: appendix divider
- Slide 43: appendix; main idea die Rechnung hinter dem Auseinanderlaufen; visual none
- Slide 44: appendix; main idea zwei weitere Grenzen (aus dem früheren Entwurf); visual zwei Karten
- Slide 45: appendix; main idea wann planen (aus dem früheren Entwurf); visual zwei Karten
- Slide 46: appendix; main idea Einzelheiten zum KI-Servicezentrum; visual drei Karten
