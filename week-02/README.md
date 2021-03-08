# APM Woche 2: Clustering


[Vorlesungsfolien](Clustering.pdf)


## Übung

Sie arbeiten mit dem Setup weiter, das Sie in Übung 1 begonnen haben. In 
dieser Übung geht es darum, den Loadbalancer, der im Moment noch einen 
_Single Point of Failure_ darstellt, hochverfügbar zu machen. Dafür 
erweitern Sie das vorhandene Setup, indem Sie einen _Backup_-Loadbalancer 
hinzufügen, der einspringt, sobald der _Master_-Loadbalancer ausfällt.

Die beiden Maschinen kommunizieren miteinander mit einem Protokoll names
[VRRP](https://de.wikipedia.org/wiki/Virtual_Router_Redundancy_Protocol).
Mit diesem Protokoll wird eine
[virtuelle IP-Adresse](https://de.wikipedia.org/wiki/Virtuelle_IP-Adresse) 
definiert, welche schnell zwischen den beiden Loadbalancers hin- und 
hergewechselt werden kann. Das funktioniert so, dass von Anfang an beide 
Loadbalancer am Laufen sind, aber nur der Master-Loadbalancer die virtuelle 
IP an sein Netzwerk-Interface bindet. Alle Requests an diese IP-Adresse 
landen deshalb bei ihm. Solange der Master am Laufen ist, bleibt der 
Backup-Loadbalancer passiv; falls der Master aber ausfällt, bindet der 
Backup-Loadbalancer die virtuelle IP sofort an sein eigenes Interface, womit 
die Requests bei ihm landen. Falls der Master wieder aktiv werden sollte, 
gibt die Backup-Maschine die IP wieder ab.

In dieser Übung verwenden Sie eine Software namens keepalived, welche das 
VRRP auf Linux implementiert.


### 1. keepalived zum Loadbalancer-Image hinzufügen

Als Erstes erweitern Sie das Loadbalancer-Image, welches Sie in der letzten 
Übung erstellt haben, und installieren keepalived darin. Das NGINX-Image 
basiert auf Debian, d. h. Pakete können mit
[`apt`](https://de.wikipedia.org/wiki/Advanced_Packaging_Tool) installiert
werden.

Fügen Sie folgende Zeilen am Ende des Dockerfiles hinzu:

    RUN apt update && apt -y install keepalived

Um zu überprüfen, dass die Installation geklappt hat, starten Sie den
Loadbalancer mit Docker (bzw. Docker Compose) und verbinden sich über das
Terminal mit dem Container. Am einfachsten geht das in IntelliJ, indem Sie im 
Services-Tab unter Docker auf den Loadbalancer-Container rechtsklicken und 
"Create Terminal auswählen". Auf der Kommandozeile können Sie stattdessen 
folgenden Befehl verwenden:

    docker exec -it apm-app_load-balancer_1 bash

Wenn Sie verbunden sind, geben Sie folgenden Befehl ein, um zu überprüfen, 
dass keepalived installiert wurde:

    keepalived -nl

Die Optionen `n` und `l` sind dazu da, dass die Ausgabe von keepalived auf der 
Kommandozeile ausgegeben werden und nicht im System-Log landen. Es sollte 
eine Fehlermeldung angezeigt werden, dass die Konfigurationsdatei fehlt. Diese 
erstellen Sie als Nächstes.


### 2. keepalived konfigurieren

Erstellen Sie eine Datei 'keepalived-master.conf' im 'load-balancer'-Ordner. 
Fügen Sie folgenden Inhalt ein:

    vrrp_instance VI_1 {
        state MASTER
        interface eth0
        virtual_router_id 101
        priority 100
        advert_int 1
        virtual_ipaddress {
            172.19.1.1
        }
    }

Damit definieren Sie, dass diese Maschine der 'Master' ist und in einem 
'Virtual Router'-Verbund mit der ID 101, welche die IP 172.19.1.1 verwendet, 
teilnimmt. Die `priority` wird zusätzlich verwendet, um zu entscheiden, 
welche Maschine jeweils zum Master wird (z. B. wenn es mehrere Backups gibt), 
und `advert_int` gibt an, wie oft der Master Heartbeat-Pakete 
(_advertisements_) verschickt. Dies ist mal nur die Konfiguration für den 
Master; der Backup-Loadbalancer braucht später seine eigene.

Um diese Datei ins Image zu kopieren, verwenden Sie wie letzte Woche `COPY`. 
Zusätzlich müssen noch die Datei-Berechtigungen angepasst werden. Erweitern 
Sie das Dockerfile nochmals um folgende Zeilen:

    COPY keepalived-master.conf /etc/keepalived/keepalived.conf
    RUN chmod -x /etc/keepalived/keepalived.conf

Als letztes müssen Sie noch zwei Änderungen im 'docker-compose.yml'-File 
vornehmen. Erstens brauchen die Loadbalancer-Container zusätzliche Rechte,
welche von VRRP vorausgesetzt werden. Dafür fügen beim 'load-balancer'-Service
folgende Zeilen hinzu:

    cap_add:
      - NET_ADMIN

Die Zeile `cap_add` muss gleich tief eingerückt sein wie `ports`. Zusätzlich 
muss das Docker-interne Netzwerk konfiguriert werden (Docker Compose 
konfiguriert das Netzwerk sonst unter Umständen mit einer Subnetzmaske, 
welche nicht mit der virtuellen IP kompatibel ist). Fügen Sie am Ende der 
Datei folgende Zeilen hinzu:

    networks:
      default:
        ipam:
          config:
            - subnet: 172.19.0.0/16
              gateway: 172.19.0.1

Starten Sie (via Docker Compose) nochmals die Container und führen Sie im 
Loadbalancer-Container `keepalived -nl &` aus. (Das `&` führt dazu, dass das 
Programm im Hintergrund ausgeführt wird und Sie weitere Befehle ausführen 
können, ohne keepalived zu beenden.) Jetzt sollte der Dienst funktionieren und
am Schluss 'Entering MASTER STATE' ausgeben. Mit dem Befehl `ip add show` 
können Sie (innerhalb des Containers) überprüfen, dass die virtuelle IP 
172.19.1.1 aufgesetzt wurde. Leider können Sie von ausserhalb von Docker 
normalerweise nicht auf diese zugreifen (dazu später noch mehr).


### 3. Einen Backup-Loadbalancer hinzufügen

keepalived und das VRRP ergeben nur Sinn, wenn man mindestens eine 
Backup-Maschine hat. Als Nächstes werden Sie dem Setup deshalb einen zweiten 
Loadbalancer-Container hinzufügen.

Da die beiden Loadbalancer-Images sehr ähnlich sein werden, ergibt es Sinn, 
die gemeinsamen Aspekte an einem einzigen Ort zu definieren. Docker stellt 
dafür einen Mechanismus zur Verfügung, der es erlaubt, Dockerfiles zu 
_parametrisieren_. Damit können Sie dasselbe Dockerfile für den Master- und 
den Backup-Loadbalancer verwenden.

Fügen Sie im Dockerfile vor dem `COPY`-Befehl für die 
keepalived-Konfigurationsdatei eine Zeile `ARG role` hinzu. Damit bekommt das 
Dockerfile einen Parameter `role`, der angibt, ob das Image für den Master- 
oder den Backup-Loadbalancer gebaut werden soll. Auf diesen Parameter können 
Sie weiter unten im Dockerfile zugreifen. Ändern Sie den `COPY`-Befehl so ab:

    COPY keepalived-${role}.conf /etc/keepalived/keepalived.conf

Der Teil `${role}` wird beim Ausführen des Dockerfile dann durch den String 
ersetzt, der für den `role`-Parameter angegeben wurde. Konkret bedeutet das, 
dass Sie jetzt zwei verschiedene Konfigurationsdateien verwenden können, 
eine für den Master- und eine für den Backup-Loadbalancer.

Kopieren Sie also die keepalived-Konfigurationsdatei, nennen Sie die Kopie 
'keepalived-backup.config' und ändern Sie `state` und `priority`. Die 
Priorität kann irgendeinen Wert haben, solange er kleiner als der des 
Masters ist.

Damit Sie wirklich zwei Loadbalancer-Container haben, ändern Sie noch die 
'docker-compose.yml'-Datei ab und fügen einen zweiten Loadbalancer-Service 
hinzu. Da hier zwei verschiedene Images verwendet werden, können Sie nicht 
einfach `replicas: 2` verwenden, sondern müssen die ganze Service-Definition 
duplizieren (und zwei verschiedene Namen definieren). Beachten Sie, dass nicht 
beide Loadbalancer das gleiche Port-Mapping verwenden können (dazu später 
mehr). Ausserdem müssen Sie noch das `role`-Argument für das Dockerfile
definieren. Ersetzen Sie die `build`-Zeile des Masters durch diese Zeilen:

    build:
      context: load-balancer
      args:
        role: master

Beim Backup-Loadbalancer geben Sie statt `master` einfach `backup` als Rolle 
an, damit die entsprechende Konfigurationsdatei ins Image kopiert wird.

Wenn Sie jetzt `docker-compose up --build` (oder das Äquivalent in IntelliJ) 
ausführen, sollten Sie zwei Loadbalancer-Container erhalten, die als Master- 
und Backup konfiguriert sind. (Allerdings wird keepalived noch nicht 
automatisch gestartet.) Als Zwischen-Überprüfung können Sie sich mit beiden 
Containern verbinden und darin jeweils den `keepalived -nl`-Befehl ausführen.
Jetzt sollte sich einer der beiden als Master aktiv werden und der andere 
passiv bleiben.


### 4. keepalived automatisch starten

Natürlich wollen Sie nicht bei jedem Start von Hand keepalived starten. Aus 
diesem Grund ändern Sie den Start-Befehl der Loadbalancer-Images so, dass 
sowohl NGINX als auch keepalived gestartet werden.

Erstellen Sie eine neue Datei 'start.sh' im 'load-balancer'-Ordner und fügen 
Sie folgenden Inhalt ein. Achten Sie darauf, dass Sie in dieser Datei die
Unix-Zeilentrennzeichen (LF statt auf Windows CRLF) gebrauchen. In IntelliJ 
können Sie dies z. B. in der Fusszeile unten rechts machen.

    #!/bin/bash
    rm -fr /var/run/keepalived.pid
    keepalived -nl &
    nginx -g "daemon off;"

Dieses Script startet keepalived im Hintergrund und danach noch NGINX. Die 
Ausgaben von beiden Programmen sollten in der Konsole erscheinen. 
Zusätzlich werden zu Beginn noch Dateien aufgeräumt, die nach einem 
"harten" Stoppen des Containers übrig bleiben und keepalived verwirren 
könnten. Um das Script in die Images zu kopieren und beim Starten der 
Loadbalancer-Container auszuführen, erweitern Sie das Dockerfile noch ein 
letztes Mal, um folgende Zeilen. Eventuell müssen Sie noch eine zusätzliche 
Zeile `RUN chmod +x /start.sh` hinzufügen.

    COPY start.sh /start.sh
    CMD ["/start.sh"]

Wenn Sie jetzt alle Container starten, sollten Sie beobachten können, wie 
die beiden Loadbalancer beim Start automatisch in den richtigen Modus 
wechseln. Überprüfen Sie, dass der Failover-Mechanismus funktioniert, indem 
Sie den Master-Container kurzzeitig stoppen und danach wieder starten:

    docker stop /apm-app_load-balancer-master_1
    docker start /apm-app_load-balancer-master_1

Beachten Sie, dass der Namen des Containers in den beiden Befehlen davon 
abhängt, welchen Namen Sie für den Master-Loadbalancer in der
'docker-compose.yml'-Datei gewählt haben.


### 5. Externer Zugriff auf die Loadbalancer

Dieses Docker-Setup hat einen Schönheitsfehler, der sich aber leider nicht 
so einfach verbessern lässt: Von ausserhalb des Docker-Netzwerks kann man 
nicht direkt auf die virtuelle IP zugreifen. Unter Linux gibt es die 
Möglichkeit, dass Docker direkt das Host-Netzwerk verwendet, aber unter 
anderen Host-Betriebssystemen geht das nicht.

Als Workaround erstellen Sie nochmals einen zusätzlichen NGINX-Reverse-Proxy, 
der als Einstiegspunkt für unsere "Cloud" dient und die Requests an die 
virtuelle IP der Loadbalancer weiterleitet. Erstellen Sie dafür ein neues 
Dockerfile und eine neue 'nginx.conf'-Datei und machen Sie die nötigen 
Änderungen im 'docker-compose.yml'-File. Am Ende soll nur der 
Einstiegs-NGINX ein Port-Mapping haben, alle anderen Server werden durch 
diesen Reverse-Proxy (und durch die Loadbalancer) erreicht.

Wenn Sie alles richtig gemacht haben, sollten Sie vom Host aus auf die URL 
[localhost:8080](http://localhost:8080) zugreifen können und auf einem der 
beiden Web-Servern landen. Sie sollten nun einen der Web-Server __und__ 
einen der Loadbalancer stoppen können, ohne dass die Web-App unerreichbar wird.
