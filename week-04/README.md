# APM Woche 4: Auswerten von Messungen


[Vorlesungsfolien](Auswerten%20von%20Messungen.pdf)


## Übung

In den bisherigen Übungen haben Sie eine Cluster-Infrastruktur aufgebaut und
eine kleine Applikation dafür entwickelt. Letztes Mal haben Sie erstmals die 
Performance dieser App untersucht, mit einem Performance-Test, den Sie mit 
Apache JMeter erstellt haben.

In dieser Übung sollen Sie spezifisch auf die Leistungsgrenzen der Applikation
und der Infrastruktur eingehen und einen Stresstest schreiben. Das Ziel ist 
es, zu verstehen, wie sich das gesamte System unter extrem hoher Last verhält.
Ausserdem sollen Sie Erfahrung mit dem Verarbeiten und Visualisieren von 
Messresultaten sammeln.


### 1. Stresstesten

Verwenden Sie JMeter, um einen Stresstest für Ihre Applikation zu erstellen. 
Sie können natürlich die Testpläne, die Sie für die letzte Übung entwickelt 
haben, zu einem Stresstest umbauen.

Verwenden Sie den Stresstest, um folgende Fragen zu beantworten:
* Ab welcher Last wird die Applikation unzuverlässig?
* Ab welcher Last wird die Applikation unbenutzbar?
* Welche Komponente der Applikation (Loadbalancer, Web-Server, 
  Cluster-Speicher) wird als Erstes zum Bottleneck? Um diese Frage zu 
  beantworten, sollten Sie auch die Logs der beteiligten Container zur Rate 
  ziehen. Versuchen Sie, das erste identifizierte Bottleneck zu beheben. 
  Falls Sie hier nicht weiterkommen, finden Sie in einem zusätzlichen 
  Dokument ein paar Hilfestellungen (Vorsicht Spoiler):
  [Bottleneck beheben](Bottleneck.md)

Die Antworten zu diesen Fragen hängen von verschiedenen Umständen und Parameter
ab.
Untersuchen Sie das Verhalten, wenn Sie folgende Variablen ändern:
* Die Art der Last: nur lesend, nur schreibend oder gemischt.
* Die Anzahl App-Server. Vergleichen Sie das Verhalten für 1, 2 und 4 Server.
  Dazu ändern Sie die Docker-Compose- und NGINX-Konfiguration und deployen die 
  App jeweils vor dem Testen neu. Sie können auch mehrere Compose-Dateien erstellen.
* Die Leistungsfähigkeit der Loadbalancer oder der App-Server.

Docker ermöglicht es, einzelnen Containern mehr oder weniger CPU-Zeit oder 
RAM zur Verfügung zu stellen. In der Docker-Compose-Datei können Sie das 
steuern, indem Sie z. B. folgendes Konfigurationselement zu einem Service 
hinzufügen:

    deploy:
      resources:
        limits:
          cpus: '0.5'

Dies führt dazu, dass für den entsprechenden Container nur eine "halbe" CPU 
zur Verfügung steht. Sie können den Wert auch weiter reduzieren. Verwenden 
Sie z. B. die Aufstartzeit der Spring-Boot-Applikation (wird im Log 
angezeigt) als Hinweis dafür, wie stark die App unter der Einschränkung 
"leidet".

Beachten Sie, dass es verschiedene mögliche Kriterien für "unzuverlässig" und
"unbenutzbar" gibt. Beobachten Sie sowohl Antwortzeiten als auch fehlerhafte 
Server-Antworten und verwenden Sie die im Unterricht gezeigten 
Visualisierungs-Techniken, um die Fragen zu beantworten (siehe zweite 
Aufgabe).


### 2. Messresultate Visualisieren

Um die Fragen oben zu beantworten (oder mindestens um die Antworten zu 
illustrieren) müssen Sie die Messresultate visuell darstellen. Die Plots, 
die Sie direkt mit JMeter erstellen können, bieten einen guten Startpunkt 
für Experimente, sind aber für tiefergehende Auswertungen nicht genügend.

Konfigurieren Sie JMeter so, dass die Messresultate in eine CSV-Datei
geschrieben werden und führen Sie den Stresstest durch. Verarbeiten und 
visualisieren Sie die resultierende(n) CSV-Datei(en) entweder mit einem 
Tabellen-basierten Werkzeug wie Excel oder mit einer Scriptsprache wie 
Python oder R. Automatisieren Sie die Auswertung so weit wie möglich, damit 
Sie immer wieder neue Resultate darstellen können und schnell zwischen 
Visualisierung und Anpassen des Stresstests hin- und herwechseln können. 
Analysieren von Performance ist praktisch immer eine iterative und 
explorative Arbeit!

Erstellen Sie ein Dokument, in welchem Sie Ihre wichtigsten Resultate kurz
anhand einiger Visualisierungen präsentieren. Um Feedback zu Ihrer Arbeit zu 
erhalten, können Sie dieses Dokument (PDF-Datei) wieder an mich senden.
