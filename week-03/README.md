# APM Woche 3: Performance messen


[Vorlesungsfolien](Performance%20messen.pdf)


## Übung

Nachdem es in den ersten zwei Übungen vor allem um Infrastruktur-Aspekte 
(Clustering, High Availability) ging, geht es in dieser Übung einerseits um 
Applikations-Aspekte und andererseits um das Durchführen von 
Performance-Messungen.

Sie arbeiten mit dem Setup aus den ersten beiden Übungen weiter. Die Web-App 
wurde allerdings für diese Übung erweitert und enthält jetzt einen (ganz 
einfachen) Key–Value-Store, inklusive Web-Interface. Der Benutzer kann einen 
Schlüssel (eine ganze Zahl) und einen dazugehörigen Wert (einen beliebigen
Text) bestimmen und dieses Schlüssel–Wert-Paar auf dem Server abspeichern. 
Falls unter einem Schlüssel bereits ein Wert existiert, wird dieser vom 
neuen Wert überschrieben. Wenn Sie das Material von dieser Woche pullen, 
sollten Sie die neue Version bereits erhalten haben.


### 1. App builden und starten

Builden Sie die Web-App im Ordner 'apm-app', wie in der Übung der Woche 1. 
Führen Sie sie lokal aus (`mvnw spring-boot:run`) und überprüfen Sie, dass 
der Key–Value-Store, der jetzt unter [localhost:8080](http://localhost:8080)
erreichbar ist, wie erwartet funktioniert. (Beachten Sie, dass Sie die App 
nicht gleichzeitig auf dem Host und in Docker starten können, da beide denselben
Port beanspruchen.)


### 2. Cluster-Speicher – Vorbereitung

Wenn die App auf mehreren Servern "balanciert" wird, ergibt sich natürlich 
das Problem, dass Werte, die auf dem einen Server gespeichert wurden, auf 
dem anderen Server nicht sichtbar sind. Mit der NGINX-Loadbalancing-Methode
`ip_hash` (IP-basierte Persistenz) wird dieses Problem zwar teilweise 
umgangen, aber realistischerweise müssen Applikationsdaten irgendwann 
zwischen den Maschinen synchronisiert werden. Dafür erweitern Sie die App in 
dieser Übung um einen "In-Memory-Datagrid" (IMDG), einem Datenspeicher für 
Cluster, welcher von den Cluster-Knoten vollständig im Hauptspeicher 
gehalten und automatisch synchronisiert wird.

Um den Effekt dieses verteilten Speichers zu sehen, müssen Sie aber auf die 
einzelnen Web-Server zugreifen können (quasi das Loadbalancing umgehen).
Ersetzen Sie in der Docker-Compose-Datei dazu den 'web-app'-Service mit den 
zwei Replicas durch zwei separate Services 'web-app-1' und 'web-app-2', 
denen Sie jeweils einen Port auf der Host-Maschine zuweisen, z. B. mit 
`8081:8080` und `8082:8080`. Damit die Loadbalancers weiterhin funktionieren,
müssen Sie auch die NGINX-Konfiguration anpassen: die Web-Server sind mit 
dieser Konfiguration nicht mehr unter `apm-app_web-app_1` und `..._2` 
erreichbar, sondern unter `apm-app_web-app-1_1` und `...-2_1`.

Überprüfen Sie, dass Sie auf beide Web-Server zugreifen können, indem Sie
[localhost:8081](http://localhost:8080) und
[localhost:8082](http://localhost:8080) in Ihrem Browser öffnen. Die 
Hostnamen sollten unterschiedlich sein. Wenn Sie auf einem der beiden Server 
einen Wert speichern, wird er auf dem anderen Server nicht erscheinen.


### 3. Ein Cluster-Speicher mit Hazelcast

Wenn Sie den Quellcode der Web-App anschauen, sehen Sie in der Hauptklasse 
`ApmApp`, dass als `Storage`-Implementation die Klasse `LocalStorage` 
verwendet wird. Diese speichert die Key–Value-Paare ganz einfach in einer 
lokalen Hash Map. Das Projekt enthält aber bereits auch die Implementation des
IMDG-basierten Speichers; Sie finden Sie in der Klasse `ClusterStorage`.
Diese Klasse verwendet die [Hazelcast-Bibliothek](https://hazelcast.org/), 
eine Open-Source-Bibliothek, welche in Java geschrieben ist (aber auch 
Bindings für viele andere Sprachen bietet).

Wie Sie sehen, ist die Konfiguration trivial; als einziger Parameter 
verlangt die Klasse einen Namen für die verteilte Map. Ohne weitere 
Konfiguration "entdecken sich" die Hazelcast-Instanzen automatisch über 
Broadcast-Messages im lokalen Netzwerk und synchronisieren sämtliche 
Änderungen an der Map. Ändern Sie die `ApmApp`-Klasse also so, dass die
`ClusterStorage`-Implementation verwendet wird (wählen Sie einen Namen für die 
verteilte Map).

Deployen Sie die gesamte App mittels Docker Compose erneut (vergessen Sie 
nicht, vorher das `package`-Goal von Maven auszuführen; siehe erste Übung).
Im Output der Web-Server sollten Sie jetzt die Log-Messages von Hazelcast 
sehen und beobachten können, wie sich die beiden Instanzen zu einem Cluster 
zusammenschliessen:

    Members {size:2, ver:2} [
        Member [172.19.0.5]:5701 - 6deb58a7-9b68-4f9a-8f22-8ac547fc1a50 this
        Member [172.19.0.3]:5701 - b831bc0f-bf14-446c-b411-1deb827fd220
    ]

Die Details der Ausgabe können natürlich variieren, aber nach einer kurzen 
Zeit sollten in beiden Logs die beiden Instanzen erscheinen. Stellen Sie
sicher, dass der Speicher richtig funktioniert, indem Sie direkt auf das 
Web-Interface des einen Servers zugreifen, dort einen Wert speichern, und 
mit dem Web-Interface des anderen Servers den Wert für denselben Schlüssel 
laden. Sie sollten die Änderung praktisch sofort sehen können.


### 4. Direkt auf den REST-Dienst zugreifen

Das Web-Interface der Applikation greift mittels `XMLHttpRequest` auf den 
Key–Value-Store zu (siehe 'script.js' im Ordner 'src/main/resources/static').
Der Server stellt dafür unter der URL `/store/{id}` einen einfachen REST-Dienst 
zur Verfügung (siehe Klasse `StoreController`).

Sie können den REST-Dienst testen, indem Sie z. B. mit dem 
Kommandozeilenprogramm `curl` HTTP-Anfragen machen. (`curl` ist auf Linux oft
schon vorinstalliert; auf anderen Systemen müssen Sie es separat installieren.) 
Der Befehl:

    curl -X PUT -H "Content-Type: text/plain" -d Hello localhost:8080/store/42

sendet einen PUT-Request an den Server und speichert unter dem Schlüssel `42` 
den Wert `Hello`. Danach können Sie den Wert mit einem GET-Request wieder
abfragen:

    curl localhost:8080/store/42

(Beachten Sie, dass die Ausgabe möglicherweise keinen Zeilenumbruch enthält 
und deshalb am Anfang der nächsten Eingabeaufforderung erscheint.) Sie können 
zusätzlich die Option `-v` verwenden,um die HTTP-Header zu sehen, falls sich 
die Befehle z. B. nicht so verhalten, wie Sie denken.


### 5. Einen Testplan erstellen

Jetzt sind Sie bereit, Performance-Messungen durchzuführen. Laden Sie dafür
[JMeter](https://jmeter.apache.org/download_jmeter) herunter. Es muss Java 8
installiert sein, um das Programm auszuführen.

Erstellen Sie einen Testplan mit JMeter, welcher die Performance-Merkmale Ihrer 
Web-Applikation unter verschiedenen Szenarien ausmisst, vor allem die Lese- und
Schreibperformance des REST-Dienstes. Überlegen Sie sich zuerst gute 
Test-Szenarien (Sie dürfen beliebige Annahmen treffen, wenn Sie sie 
vernünftig begründen können) und fragen Sie sich, welche Resultate Sie erwarten.

Als Hilfestellung können Sie sich zu folgenden Aspekten Gedanken machen:

* **Zugriffs-Art**: Mehrere Szenarien sind möglich: Ein Benutzer schreibt und 
  liest immer auf der selben Node; ein Benutzer schreibt immer auf derselben
  Node, aber seine Änderungen müssen auf den anderen Nodes sichtbar sein; oder
  ein Benutzer schreibt und liest eventuell auf verschiedenen Nodes.
* **Daten**: Die Datenmenge kann ein Unterschied für die Performance machen. 
  Was wird gemessen, wenn ein Benutzer statt kleiner Werte grosse 
  Datenmengen speichert?
* **Lese-/Schreibverhältnis**: Wie definieren Sie ein vernünftiges 
  Lese-/Schreib-Verhältnis?

Halten Sie Ihre Überlegungen in einem Testplan-Dokument fest. Folgende 
Punkte, welche aus dem [IEEE-Standard für Software-Test-Dokumentation](https://ieeexplore.ieee.org/document/4578383)
bekannt sind (Volltext-Zugang durch das FHNW-Intranet, aber nicht unbedingt 
nötig), sollten darin enthalten sein:

1. **Einleitung**
2. **Test items**
3. **Features to be tested**  
   Beschreiben Sie kurz die Aspekte der Web-App, die 
   Sie testen wollen.
4. **Approach**  
   Erklären Sie kurz die Vorgehensweise (d. h. aktives Monitoring 
   mittels Lastgenerator) und beschreiben Sie dann ihre Test-Szenarien im 
   Detail.
5. **Environmental needs**  
   Halten Sie fest, welche Bedingung an die Testumgebung Sie voraussetzen, bzw.
   wie die existierende Umgebung aussieht. Hier gibt es zwei Seiten, die 
   *zu* testende Infrastruktur und die Testing-Seite.

Wenn Sie gerne ein Feedback zur Ihrer Lösung möchten, können Sie das
Testplan-Dokument (als PDF-Datei) und die JMX-Datei von JMeter per E-Mail an
mich senden.
