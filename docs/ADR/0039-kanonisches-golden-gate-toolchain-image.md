# ADR-0039: Kanonisches Golden-Gate-Toolchain-Image

- **Status**: Accepted
- **Datum**: 2026-10-19

## Kontext

Die native Windows-/OneDrive-Toolchain und der kontrollierte WSL-Fallback
können die durch `bun.lock` definierte P1-Prüfumgebung nicht zuverlässig
bereitstellen. Die bestehende GitHub-CI verwendet bereits Ubuntu und Bun,
jedoch noch keine versionierte, lokal wiederverwendbare Toolchain-Definition.

## Entscheidung

Das Projekt führt ein eigenes, versionskontrolliertes Dev-Container-Image als
kanonischen lokalen Golden-Gate-Toolchain-Fallback ein. Es pinnt Ubuntu, Node
22 und Bun, enthält nur generische Build-Werkzeuge und führt das P1-Gate über
einen projektversionierten Entrypoint aus. Abhängigkeiten werden ausschließlich
mit `bun install --frozen-lockfile` aus `bun.lock` hergestellt.

Das Image enthält weder Arbeitsquellcode noch `node_modules`, Browser-Binaries,
Supabase, Docker-Socket oder Secrets. Der Gate-Lauf bindet den Checkout ein,
läuft nicht als Root und protokolliert HEAD, Worktree-Zustand sowie Bun-/Node-
Versionen.

Vor jedem lokalen Container-Gate-Lauf ist auf dem Host mit `docker version`
zu verifizieren, dass Client und Server erreichbar sind. Der Entrypoint darf
als Git-Sicherheitsausnahme ausschließlich den explizit eingebundenen
Workspace markieren; er darf weder globale Pfade noch Host-Konfigurationen
freigeben.

## Alternativen

- Native Windows-/OneDrive-Toolchain: verworfen, weil Reparse-Verzeichnisse
  und Bun-Lifecyclefehler keine belastbare lokale Evidenz liefern.
- WSL-Toolchain als alleiniger Standard: verworfen, weil deren Bootstrap vom
  Benutzer- und Hostzustand abhängt.
- npm-Fallback ohne zweite Lockdatei: verworfen, weil er nicht
  lockfile-identische Versionen auflöst.

## Konsequenzen

Ein erfolgreicher lokaler Containerlauf ist notwendige lokale Evidenz, ersetzt
aber keinen signierten Kandidaten, keine Exact-Head-CI und keine Exact-Head-
Security. Die bestehende CI und gemeinsame Templates werden erst nach einem
erfolgreichen P1-Pilot separat bewertet. Das Image verändert weder Produktcode
noch Deployment.

## Trust-Boundary / Security-Note

Container erhalten keine Produktivsecrets. Nicht verfügbare Docker-
Infrastruktur wird als `BLOCKED` dokumentiert; sie darf nicht durch einen
unspezifizierten Host-Fallback als PASS ersetzt werden.

Alle anwendbaren lokalen P1-Gates werden über dieses Image ausgeführt.
Native Host-Läufe dürfen nur Diagnose-Evidenz liefern, nicht aber ein
Container-Gate ersetzen.

## Nachweisbare Einfuehrung und Ablaufverbesserungen

Die folgenden Schritte sind als tatsaechliche Einfuehrungsevidenz festgehalten:

1. Das Image wurde aus `.devcontainer/Dockerfile` als
   `sysingdashboard-golden-gate:local` gebaut. Der Nicht-Root-Vertrag wurde
   mit Bun `1.4.3`, Node `22.23.3`, Git und Unzip geprueft.
2. Ein erster Lauf wurde durch einen nicht laufenden Docker-Daemon blockiert.
   Deshalb ist `docker version` mit Client und Server vor jedem Containerlauf
   verpflichtend; ein fehlender Server-Endpunkt bleibt `BLOCKED`.
3. Der Preflight wurde danach erfolgreich mit Client und Server `29.7.2`
   wiederholt.
4. Der erste gemountete Checkout wurde von Git wegen abweichendem Container-
   Eigentuemer als `dubious ownership` abgewiesen. Die Diagnose belegt den
   Windows-Mount als Ursache, nicht den Projekt- oder Git-Zustand.
5. Der Entrypoint markiert deshalb nur den konkret eingebundenen Workspace als
   `safe.directory`. Ein Regressionstest erzwingt den Eigentuemerunterschied
   und beweist, dass danach der erwartete Dirty-Worktree-Blocker erreicht wird.
6. Der Entrypoint-Vertrag lief danach im Image gruen: fehlendes Lockfile,
   Dirty Worktree und Windows-Mount-Worktree werden fail-closed geprueft.
   Der reale P1-Checkout bleibt bis zu einem sauberen Kandidaten
   erwartungsgemaess `BLOCKED: dirty worktree`.

Diese Historie ist keine P1-Freigabe. Sie dokumentiert nur die
Funktionsfaehigkeit des lokalen Evidenzpfads und seine Fail-Closed-Grenzen.

Ein ungepushter Clean-Candidate-Snapshot unter `C:\tmp` darf den vollstaendigen
Containerlauf vor dem signierten Kandidaten ermoeglichen. Sein Git-Tree ist zu
protokollieren und muss spaeter mit dem signierten Exact Head identisch sein.
Er erzeugt ausschliesslich vorlaeufige Testevidenz und niemals eine PR-,
Merge- oder Release-Freigabe.

Der erste Clean-Candidate-Snapshot wurde als lokaler Commit `383a7881` mit
Git-Tree `0e75a78c` erzeugt. Docker-Preflight und Entrypoint-Regressionstest
waren gruen. Der vollstaendige Lauf erreichte `GATE=install`, hing dann in
`bun install --frozen-lockfile` ohne Fortschrittsausgabe und lief nach zehn
Minuten in einen Timeout. Ein anschliessender Diagnose-Exec antwortete
ebenfalls nicht innerhalb von 60 Sekunden. Der ausschliesslich fuer diesen
Lauf gestartete Container `c6b54d0ba050` wurde kontrolliert beendet. Das ist
eine Infrastrukturblockade, kein P1-PASS und kein Nachweis fuer nachfolgende
Gates.

Die Verbose-Diagnose hat erreichtbare Registry-HTTP-200-Antworten, aber viele
gleichzeitige 26--34-Sekunden-Downloads bei Buns Standardnetzparallelitaet von
48 gezeigt. Der Entrypoint begrenzt `bun install` deshalb auf
`--network-concurrency 8`. Ein RED-Test hat die fehlende Vorgabe nachgewiesen;
der anschliessende GREEN-Lauf hat den aktualisierten Entrypoint-Vertrag im
Image mit allen vier Faellen bestaetigt.

Der Entrypoint wurde anschliessend um einen ereignisbasierten Statusvertrag
erweitert. Jede Meldung enthaelt UTC-Zeit, Phase, Status, Klasse, Grund,
naechste Aktion und Versuch. Installationsfehler werden mit begrenzter,
konfigurierbarer Wiederholung behandelt und danach klar als
`BLOCKED/DEPENDENCY_INSTALL` beendet; nachfolgende Gates werden nicht
stillschweigend ausgefuehrt. Der Docker-Vertragslauf bestand danach sechs
Faelle, einschliesslich strukturierter Preflight-Blockierung und Retry-Policy.
Dies verbessert Transparenz und Betriebssicherheit, ohne Produktverhalten,
Lockfile oder Freigabekriterien zu aendern.

Fuer lange Gates erzeugt der Entrypoint zudem einen getesteten Heartbeat im
Ereignisstrom. Damit kann ein Beobachter Fortschritt von Stillstand
unterscheiden, auch wenn der aufrufende Tool-Transport Standard-Output
puffert. Die zulassige Ausweichbeobachtung ist ausschliesslich read-only:
Containerstatus, letzte Logs sowie einmalige CPU-, Netzwerk- und I/O-Werte.

Der beobachtete P1-Rerun hat diese Grenze angewendet: Preflight und
Entrypoint-Vertrag waren gruen, der saubere Kandidat arbeitete im
Installationsschritt mit nachweisbarer CPU- und I/O-Aktivitaet, ueberschritt
aber das 30-Minuten-Budget. Er wurde als `BLOCKED/TIMEOUT` dokumentiert und
der ausschliesslich dafuer gestartete Container kontrolliert beendet. Das
verhindert sowohl einen falschen PASS als auch eine unbounded Ursachenforschung.

## Folgeentscheidung: persistente, vertraglich gebundene Abhaengigkeitscaches

Ein kurzlebiger Container darf nicht erzwingen, dass jeder Golden-Gate-Lauf
Abhaengigkeiten erneut aus dem Netz laedt. Der wiederverwendbare
Abhaengigkeitsvertrag lautet deshalb:

`Image-Digest + Bun-Version + Linux-Plattform + SHA-256(bun.lock)`.

Fuer einen bisher unbekannten Vertrag fuehrt ein separater,
ressourcenbegrenzter `dependency-prepare`-Lauf einmalig
`bun install --frozen-lockfile --network-concurrency 8` aus. Ausschliesslich
Bun-Paketcache, `node_modules` und ein Manifest mit diesem Vertrag werden in
einem benannten Docker-Volume gespeichert. Der Checkout, Produktivsecrets und
sonstige Laufzeitdaten duerfen nie in diesem Volume liegen.

Vor jedem Golden-Gate-Lauf validiert der Entrypoint Manifest und Vertrag. Nur
bei exakter Uebereinstimmung darf er den Cache ohne Netzinstallation nutzen.
Fehlt das Manifest, ist es beschaedigt oder passt es nicht, ist der Lauf
fail-closed mit `BLOCKED/DEPENDENCY_PROVENANCE` und der Aktion
`run-dependency-prepare`; er darf keinen Cache anderer Vertrage uebernehmen
oder selbst unprotokolliert installieren.

Eine Aenderung von `bun.lock`, der Bun-Version, der Linux-Plattform oder des
Image-Digest erzeugt einen neuen Vertrag und erfordert einen erneuten
Prepare-Lauf. Der Prepare-Lauf erhaelt denselben Host-Preflight, die
maschinenlesbaren Events, Heartbeats, Retry-Grenzen und die Fehlerklassifikation
wie die Golden-Gate-Ausfuehrung. Seine Evidenz beschleunigt nachfolgende
Kandidatenlaeufe, ersetzt aber niemals deren Tests, Signatur, Exact-Head-CI
oder Exact-Head-Security.

Die Entrypoint-Vertragstests laufen unter Windows in einer isolierten Git-Bash-
Umgebung mit eigenem temporaeren `HOME`. Dadurch duerfen lokale SSH-Signing-,
Git- oder WSL-Einstellungen weder die Fixtures noch das Testergebnis
beeinflussen. Ein Regressionstest erzwingt zudem einen fehlgeschlagenen
Prepare-Installationslauf mit Heartbeat und prueft, dass dessen Nichtnull-
Exit-Code als `BLOCKED/DEPENDENCY_INSTALL` erhalten bleibt. Ein fehlgeschlagener
Installationsschritt darf niemals als erfolgreicher Prepare-Lauf maskiert
werden.

Die daraus abgeleitete Betriebsregel ist verbindlich: Shell-Vertragstests
verwenden auf Windows Git Bash mit temporaerem `HOME`; WSL ist kein stiller
Fallback. Nach einer reproduzierten Infrastrukturblockade gibt es nur einen
Wiederholungsversuch in der vorgesehenen Umgebung. Danach wird der Lauf mit
Umgebung, Ursache und naechster Aktion als `BLOCKED` dokumentiert. Weitere
Varianten sind nur als neuer, isolierter Vertragstest oder nach ausdruecklicher
Freigabe zulaessig. Damit bleibt Wiederholung eine nachvollziehbare Ausnahme
statt eine verdeckte, langwierige Fehlersuche.

## Betrieb: sichere Docker- und WSL-Speicherwartung

Der wachsende Docker-WSL-VHDX-Speicher wird durch eine projektlokale,
standardmaessig nicht destruktive Wartungsroutine beobachtet:
`scripts/golden-gate/clean-docker-toolchain.ps1`. Ohne `-Apply` inventarisiert
sie Docker-Artefakte und meldet einen vorhandenen Docker-WSL-VHDX-Pfad samt
Groesse. Mit `-Apply -ConfirmationToken CLEAN_GOLDEN_GATE_CACHE` darf sie nur
gestoppte Container mit `org.sysingdashboard.golden-gate=true` und
unreferenzierte Volumes mit dem Praefix `sysingdashboard-gg-` entfernen.

Globale Prune-Befehle, nicht zugeordnete Artefakte und BuildKit-Caches bleiben
ausdruecklich ausserhalb ihres Geltungsbereichs. Die Routine kompaktiert keine
VHDX-Datei automatisch, weil dies ein gestopptes Docker Desktop/WSL voraussetzt
und andere WSL-Distributionen beruehren kann. Sie liefert dafuer nur die
nachvollziehbare Inventur; ein manueller Kompaktierungsvorgang ist ein eigener,
freigegebener Wartungsschritt.
