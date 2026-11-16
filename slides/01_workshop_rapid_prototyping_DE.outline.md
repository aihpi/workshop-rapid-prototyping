# 01_workshop_rapid_prototyping_DE.pptx

slides: 46  visible: 46
hidden: []
figure-heavy: [3, 11, 14, 15, 17, 18, 28, 32, 34, 38]
existing PINGO slides: []
duplicate titles: {}

## Slide 1: Rapid Prototyping via Vibe Coding
layout: Titelfolie
- Workshop, Teil 1
- Hanno Müller
- KI-Servicezentrum Berlin-Brandenburg am HPI
- 16.11.2026

## Slide 2: Bevor wir beginnen
layout: Inhalt 1 - gelb
- Anwesenheitsliste bitte weitergeben
- Material zum Abschreiben: github.com/aihpi/workshop-rapid-prototyping, Ordner 03_workshop/01_workshop
- Fragen jederzeit

## Slide 3: Wir senken Barrieren für den Einsatz von KI [figure-heavy]
layout: Inhalt 1 - gelb
- Kostenlos für Wirtschaft, Verwaltung und Gesellschaft
diagram labels: KI-Servicezentrum Berlin-Brandenburg am HPI; Bildung; Beratung; Infrastruktur; hpi.de/kisz

## Slide 4: Ablauf heute
layout: Inhalt 1 - gelb
  | Begrüßung und Ziel | 8 |
  | 1 Was ist Rapid Prototyping? | 10 |
  | Prompt 0: ein Satz, ein Instrument | 25 |
  | Was habt Ihr bekommen? | 7 |
  | 2 Wo Prototypen tragen und wo nicht | 20 |
  | 3 Gut prompten | 20 |
  | Pause | 15 |
  | 4 Übung: Dein Instrument in zwei Schritten | 50 |
  | 5 Diskussion | 18 |
  | Abschluss | 7 |
  | Summe | 180 |

## Slide 5: Das nehmt Ihr heute mit
layout: Inhalt 1 - gelb
- Eine Datei, die im Browser spielt
- Die Prompts 0 bis 4
- Zum Weiterbauen zu Hause, mit jedem Chatbot
- Ein Gespür für die Grenze
- Wann ein Prototyp reicht und wann nicht
diagram labels: 1; Ein eigenes Instrument; 2; 3

## Slide 6: Was ist Rapid Prototyping?
layout: Zwischentitel - blau
diagram labels: Teil 1 von 5

## Slide 7: Wer sitzt im Raum?
layout: Inhalt 1 - gelb
- Wer hat schon einmal programmiert?
- Wer nutzt regelmäßig einen Chatbot?
- Was würdet Ihr gern bauen, wenn Ihr es könntet? Drei Stimmen aus dem Raum.
diagram labels: Handzeichen:

## Slide 8: Rapid Prototyping heißt: schnell etwas zum Anfassen bauen
layout: Inhalt 1 - gelb
- Das Ziel ist nicht das fertige Produkt. Das Ziel ist die Antwort auf die Frage, ob die Idee trägt.
diagram labels: Idee; Prototyp; Ausprobieren; Lernen

## Slide 9: Ein Prototyp ist kein Produkt
layout: Inhalt 1 - gelb
  |  | Prototyp | Produkt |
  | Zweck | lernen, ob die Idee trägt | täglich benutzt werden |
  | Lebensdauer | Tage | Jahre |
  | Nutzende | ich selbst | viele |
  | Fehler | erlaubt | teuer |
  | Wer kennt das Innenleben | niemand muss | ein Team muss |

## Slide 10: Vibe Coding: Du beschreibst, die KI baut
layout: Inhalt 1 - gelb
- Du schreibst dem Chatbot in eigenen Worten, was die Software tun soll. Diese Anweisung heißt Prompt
- Die Antwort ist Code: ein langer Text, den Du als HTML-Datei speicherst. Eine HTML-Datei ist eine Webseite, die Dein Browser öffnet
- Änderungen wieder in eigenen Worten beschreiben
diagram labels: Beschreiben; Ausprobieren; Nachbessern

## Slide 11: Prompt 0: ein Satz, ein Instrument [figure-heavy]
layout: Inhalt 1 - gelb
- Chatbot öffnen. Nimm einen anderen als die Person neben Dir, damit wir später vergleichen können: Gemini, ChatGPT oder Claude
- Den Code aus der Antwort in einen Texteditor kopieren (Windows: Editor, Mac: TextEdit) und als drum.html speichern
- Datei doppelklicken, auf die Seite klicken, Play drücken
- Baue mir eine Drum Machine als einzelne, eigenständige HTML-Datei.
- Verlangt ein Chatbot ein Konto, nimm den, den Du sonst nutzt. Öffnet sich ein Texteditor statt des Browsers: Rechtsklick auf die Datei, "Öffnen mit", Browser wählen. 25 Minuten.
diagram labels: 1; 2; Diesen Satz senden; 3; 4

## Slide 12: Was habt Ihr bekommen?
layout: Inhalt 1 - gelb
- Vergleicht mit der Person neben Euch:
- Was ist gleich?
- Was ist anders?
- Was fehlt, das Ihr erwartet hättet?
- Derselbe Satz, zwanzig verschiedene Instrumente. Alles, was Ihr nicht gesagt habt, hat die KI entschieden.

## Slide 13: Wo Prototypen tragen und wo nicht
layout: Zwischentitel - blau
diagram labels: Teil 2 von 5

## Slide 14: Dafür eignet sich Vibe Coding [figure-heavy]
layout: Inhalt 1 - gelb
- Rechner, Formulare, Checklisten für eine Person
- Eine Tabelle auswerten, ein Diagramm zeichnen
- In einer Stunde sehen, ob etwas funktioniert
diagram labels: Kleine Werkzeuge; Daten sichtbar machen; Ideen prüfen; Abläufe vereinfachen; Vorlagen und Textbausteine erzeugen

## Slide 15: Ein Musiker baut Instrumente für seinen Unterricht [figure-heavy]
layout: Inhalt 1 - gelb; pictures/charts: 3
- Tom Tiest, Musiker und Dozent an der PLX
- Keine Ausbildung in Softwareentwicklung
- Acht Instrumente, jedes eine HTML-Datei, jedes mit einem Chatbot gebaut
- Seine Studierenden lernen damit KI und digitale Musikproduktion
diagram labels: iamarabbit.com; Beat Machine; Synth Machine; Mix Console

## Slide 16: Die Instrumente sollen zusammen spielen
layout: Inhalt 1 - gelb
- Jedes Instrument spielt ein Muster aus 16 Schritten in einer Schleife. Das nennt man Sequencer
- Wie in einer Band müssen beide im selben Moment mit Schritt 1 beginnen
- Zwei Fenster wissen nichts voneinander. Wie beginnen sie gleichzeitig?
diagram labels: Schlagzeug; Bass

## Slide 17: Sein Trick: Start nur bei einem Vielfachen von vier Sekunden [figure-heavy]
layout: Inhalt 1 - gelb
- Aus seinem Prompt, übersetzt aus dem Niederländischen: "Kannst du dafür sorgen, dass der Sequencer immer in dem Moment beginnt, in dem die Sekunden der Computerzeit ein Vielfaches von 4 sind?"
diagram labels: 0 s; 4 s; 8 s; 12 s; Uhr des Computers; Fenster 1; Fenster 2

## Slide 18: Zwei Fenster, ein Takt [figure-heavy]
layout: Inhalt 1 - gelb; pictures/charts: 2
- Was passiert, wenn Tom in einem Fenster das Tempo ändert, also wie schnell das Muster läuft? Handzeichen: bleibt im Takt oder läuft auseinander?

## Slide 19: Jede Datei hat ihre eigene Uhr
layout: Inhalt 1 - gelb
- gemeinsam ist nur der Startzeitpunkt
- Die Uhr des Computers gibt nur den Startmoment vor. Danach zählt jede Datei ihre Schritte selbst
- Sie laufen auseinander: Das andere Fenster erfährt nichts von der Änderung
- Wie ein Orchester ohne Dirigentin. Alle setzen gleichzeitig ein, danach hört niemand auf die anderen.

## Slide 20: Acht Dateien, vieles mehrfach gebaut
layout: Inhalt 1 - gelb
  | Baustein | Wie oft gebaut |
  | Schrittfolge (Sequencer) | 4 mal, jedes Mal anders |
  | Hall (Nachhall wie in einer Kirche) | 4 mal, jedes Mal anders |
  | Start im Takt | 3 Fassungen |
  | Muster speichern | in keiner Datei |
- Wer den Hall verbessern will, muss vier Dateien ändern. Wer die Seite neu lädt, verliert sein Muster.

## Slide 21: Zwei Grenzen, die der Fall zeigt
layout: Inhalt 1 - gelb
- Jede Verbesserung muss in mehrere Dateien. Niemand hat den Code gelesen
- Jedes neue Instrument bringt wieder seine eigene Uhr und seinen eigenen Hall mit
diagram labels: Schwer zu pflegen; Wächst schlecht

## Slide 22: Was fehlt, ist Architektur
layout: Inhalt 1 - gelb
- Eine Anwendung, acht Instrumente, eine Uhr
- Architektur heißt: entscheiden, aus welchen Teilen etwas besteht und was die Teile sich teilen.
- Kein Prompt hat nach einer gemeinsamen Uhr gefragt. Also hat niemand sie entschieden.
diagram labels: Acht Dateien, acht Uhren

## Slide 23: Gut prompten
layout: Zwischentitel - blau
diagram labels: Teil 3 von 5

## Slide 24: Eindeutig formulieren
layout: Inhalt 1 - gelb
- "Mach mir eine App für Aufgaben." Welche Aufgaben? Mit Terminen? Wo gespeichert?
- "Eine To-do-Liste als einzelne HTML-Datei. Hinzufügen mit Enter, abhaken per Klick, löschen per Doppelklick. Gespeichert im Browser."
- Lässt sich ein Satz auf zwei Arten lesen, wählt die KI eine davon.
diagram labels: Vage; Eindeutig

## Slide 25: Details beschreiben: fünf Fragen
layout: Inhalt 1 - gelb
  | Frage | Antwort im Prompt |
  | Was soll es tun? | Aufgaben hinzufügen, abhaken, löschen |
  | Wie viele? | 16 Schritte, 3 Kanäle, 3 Klänge pro Kanal (aus Toms Prompt) |
  | Womit bediene ich es? | Enter, Klick, Doppelklick |
  | Wohin mit den Daten? | gespeichert im Browser |
  | In welchem Format? | eine einzelne HTML-Datei |

## Slide 26: Jetzt Ihr: Prompt 0 mit Details
layout: Inhalt 1 - gelb
- Schreibt den Satz von vorhin zu zweit neu und beantwortet drei der fünf Fragen.
- Baue mir eine Drum Machine als einzelne, eigenständige HTML-Datei.
- Noch nicht senden. 4 Minuten, dann zwei Beispiele aus dem Raum. Wer mag, sendet ihn in der Übung statt Prompt 1.

## Slide 27: Die Architektur entscheidest Du
layout: Inhalt 1 - gelb
  | Frage vor dem ersten Prompt | Toms Instrumente | Vorratsliste für Kaffeebohnen |
  | Welche Teile gibt es? | acht Instrumente | Vorrat, Einkaufsliste |
  | Was teilen sich die Teile? | die Uhr | die Liste der Sorten |
  | Wo liegen die Daten? | nirgends, nichts wird gespeichert | im Browser |

## Slide 28: Ein Feature nach dem anderen [figure-heavy]
layout: Inhalt 1 - gelb
- Nach jedem Schritt die Datei unter neuem Namen sichern: drum1.html, drum2.html
- Geht etwas kaputt, zurück zur letzten Fassung
diagram labels: Grundgerüst; ausprobieren, sichern; Klang; eigenes Feature; Presets

## Slide 29: Trick: Lass die KI fragen
layout: Inhalt 1 - gelb
- Die KI schreibt daraus einen genauen Prompt für einen neuen Chat
- Du kennst Dein Ziel noch nicht genau
- Die KI stellt Dir Fragen, bis es klar ist, und schreibt erst dann den Prompt
- Im neuen Chat beginnt die KI ohne das alte Gespräch.
- "Schreib keinen Code in diesem Gespräch. Stelle mir Fragen, bis Du genug weißt, und gib mir dann einen Prompt für einen neuen Chat."
diagram labels: Du kennst Dein Ziel

## Slide 30: Pause
layout: Inhalt 1 - gelb
diagram labels: 15 Minuten

## Slide 31: Übung
layout: Zwischentitel - blau
diagram labels: Teil 4 von 5

## Slide 32: Dein Instrument in zwei Schritten [figure-heavy]
layout: Inhalt 1 - gelb
- Die Dateien liegen im Ordner 03_workshop/01_workshop. Für Prompt 2: Deine HTML-Datei im Texteditor öffnen, alles markieren, kopieren und unter den Prompt einfügen. 50 Minuten.
diagram labels: Prompt 1; Drum Machine; 01_beat_machine_prompt.txt; Prompt 2; Klang formen; 02_sound_design_prompt.txt

## Slide 33: Wenn etwas hakt
layout: Inhalt 1 - gelb
  | Problem | Lösung |
  | Kein Ton | erst auf die Seite klicken, dann Play |
  | Der Chatbot hört mitten im Code auf | "Bitte gib mir die ganze Datei noch einmal" senden |
  | Der Chatbot weigert sich oder antwortet ohne Code | neuen Chat öffnen, Prompt erneut senden |
  | Die Datei öffnet sich im Texteditor | Rechtsklick auf die Datei, "Öffnen mit", Browser wählen |
  | Nach einer Änderung geht nichts mehr | zurück zur letzten gesicherten Fassung |

## Slide 34: Für Schnelle: eigenes Feature oder eigener Prototyp [figure-heavy]
layout: Inhalt 1 - gelb
- 04_feature_prompt.txt, die KI interviewt Dich zu Deinem Feature
- Oder eine eigene Idee wählen
- Das, was Du am Anfang gern bauen wolltest
- Die drei Fragen von Folie 27
diagram labels: 1; Prompt 4 nehmen; 2; 3; Architektur klären, dann bauen

## Slide 35: Diskussion
layout: Zwischentitel - blau
diagram labels: Teil 5 von 5

## Slide 36: Was lief gut, wo hakte es?
layout: Inhalt 1 - gelb
- Was hat auf Anhieb funktioniert?
- Wo musstet Ihr nachfragen oder neu anfangen?
- Ein Satz pro Person reicht.

## Slide 37: Wo kam Euer Prototyp an Grenzen?
layout: Inhalt 1 - gelb
- Was würdet Ihr dieser Datei nicht anvertrauen?
- Was müsste jemand entscheiden, bevor daraus ein Produkt wird?

## Slide 38: Derselbe Prompt, verschiedene Chatbots [figure-heavy]
layout: Inhalt 1 - gelb; pictures/charts: 3
- Handzeichen: Wer hat Gemini benutzt, wer ChatGPT, wer Claude?
- Was fiel im Vergleich mit der Person neben Euch auf?
diagram labels: Claude; Gemini; ChatGPT

## Slide 39: Der Prototyp entsteht in Minuten, die Architektur bleibt Deine Aufgabe
layout: Inhalt 1 - gelb
- Ein Instrument, das spielt, in weniger als einer Stunde
- Acht Instrumente ohne gemeinsame Uhr
diagram labels: Heute gebaut; Heute gesehen

## Slide 40: Wie es weitergeht
layout: Inhalt 1 - gelb
- Mit Prompt 3 und Prompt 4 weiterbauen
- Vom Prototyp zur Anwendung, mit einem KI-Assistenten, der im Projekt mitarbeitet
- Kostenlos, für Eure eigene Idee
diagram labels: Zu Hause; Teil 2 der Reihe; KI-Beratungsstunde

## Slide 41: Vielen Dank
layout: Inhalt 1 - gelb
diagram labels: Hanno Müller; KI-Servicezentrum Berlin-Brandenburg am HPI; kisz@hpi.de; hpi.de/kisz

## Slide 42: Anhang
layout: Zwischentitel - blau
- Hintergrund für Fragen, nicht Teil des Hauptpfads

## Slide 43: Warum die Fenster auseinanderlaufen
layout: Inhalt 1 - gelb
- Die vier Sekunden legen nur den Start fest. Danach läuft jede Datei mit ihrer eigenen Uhr
- Ein Durchlauf mit 16 Schritten dauert 240 geteilt durch das Tempo (Schläge pro Minute) in Sekunden
- Bei Tempo 120 dauert er 2 Sekunden und passt genau in das Raster von 4 Sekunden
- Bei Tempo 100 dauert er 2,4 Sekunden. Ein Fenster, das 4 Sekunden später startet, liegt 1,6 Sekunden daneben

## Slide 44: Weitere Grenzen von Prototypen
layout: Inhalt 1 - gelb
- Die KI probiert ihren Code nicht aus. Was beim ersten Versuch klappt, kann bei seltenen Eingaben still versagen
- Wer nichts vorgibt, überlässt diese Entscheidungen der KI
diagram labels: Ungewöhnliche Eingaben; Sicherheit und Datenschutz

## Slide 45: Wann einfach anfangen, wann erst planen?
layout: Inhalt 1 - gelb
- Wegwerfprototyp, läuft nur bei Dir, Anforderungen noch offen
- Soll länger leben, andere arbeiten daran, enthält fremde Daten oder Zahlungen
diagram labels: Einfach anfangen; Erst planen

## Slide 46: Das KI-Servicezentrum im Detail
layout: Inhalt 1 - gelb
- Workshops, Gastvorträge auf tele-task.de, Kurse auf open.hpi.de
- KI-Beratungsstunde auf Anfrage, Pilotprojekte mit Bewerbung alle drei Monate
- Kostenlos nutzbar, kein Produktionsbetrieb, Ergebnisse werden veröffentlicht
diagram labels: Bildung; Beratung; Infrastruktur
