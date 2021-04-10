# APM Woche 1: Load Balancing


[Vorlesungsfolien](Loadbalacing.pdf)


## Übung


Klonen Sie dieses Git-Repository um die Übungsvorlage zu erhalten. Um neues
Material zu erhalten, pullen Sie einfach wieder von diesem Repository. Wenn Sie
Ihre eigenen Änderungen auf GitHub pushen wollen, forken Sie das Repository
stattdessen.


### 1. App builden und starten

Builden Sie die Web-App im Ordner 'apm-app', indem Sie `mvnw package` darin
aufrufen. Dafür muss die `JAVA_HOME`-Umgebungsvariable gesetzt sein. Als
Alternative können Sie das 'apm-app'-Projekt als Maven-Projekt in Ihrer IDE
importieren und den entsprechenden Maven-Befehl dort ausführen.

Wenn der Build erfolgreich war, führen Sie die Web-App mit folgendem Befehl
aus: `mvnw spring-boot:run`. Sie sollten die Web-App nun unter
[localhost:8080](http://localhost:8080) aufrufen können. Stoppen Sie die App
mittels Ctrl+C.


### 2. App containerisieren

Damit wir die App einfach skalieren können, verpacken wir sie in einen
Docker-Container. Dafür müssen Sie zuerst
[Docker installieren](https://www.docker.com/products/docker-desktop). Erstellen
Sie dann im Projeckt-Ordner 'apm-app' eine Datei mit Namen
'Dockerfile' (ohne Dateiendung), welche ein Docker-Image definiert, und kopieren
Sie folgenden Inhalt rein:

    FROM openjdk:11-jre-slim-buster
    RUN addgroup --system spring && adduser --ingroup spring --system spring
    USER spring:spring
    COPY target/*.jar app.jar
    ENTRYPOINT ["java","-jar", "app.jar"]

Diese Befehle erstellen ein Image, welches die Java-Laufzeitumgebung und die
JAR-Datei der Web-App enthält. Die Web-App wird zur Sicherheit mit einem
Benutzer 'spring' ohne Root-Rechte ausgeführt. Erstellen Sie das Image, indem
Sie folgenden Befehl auf der Kommandozeile aufrufen (dafür muss Docker im
Hintergrund laufen):

    docker build -t apm-app .

Die Option `-t apm-app` gibt dem Image einen sinnvollen Namen. Jetzt können
Sie die App in einem Container starten:

    docker run -it -p 8080:8080 apm-app

Die Optionen `-it` sorgen dafür, dass die Kommandozeile mit dem Container
verknüpft wird und `-p 8080:8080` veröffentlicht den Containerport 8080 mit dem
Hostpost 8080. Sie sollten die App wiederum unter
[localhost:8080](http://localhost:8080) aufrufen können. Wie Sie sehen, läuft
die App nun in einem Container, denn der Hostname entspricht nicht mehr dem
Ihres Computers, sondern einem von Docker generierten Container-Hostname. Mit
Ctrl+C stoppen Sie die App und den gesamten Container wieder.

[IntelliJ IDEA](https://www.jetbrains.com/de-de/idea/) hat übrigens eine 
Docker-Unterstützung, mit welcher Sie Dockerfiles direkt aus dem Editor 
builden und starten können.


### 3. App skalieren

Als nächstes skalieren wir die App; dafür brauchen wir einen Loadbalancer. 
Dieses Jahr verwenden wir
[NGINX](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/),
eigentlich ein HTTP-Server, der aber einige Loadbalancing-Funktionen bietet. 
Für NGINX gibt es bereits ein Docker-Image, das wir aber noch mit unserer 
Konfiguration erweitern werden.

Erstellen Sie als erstes eine Datei namens 'docker-compose.yml' im 
Projektordner. Mit [Docker Compose](https://docs.docker.com/compose/) kann 
man einfach mehrere Container (Services) zu einer Applikation zusammenfügen. 
Unsere Applikation wird aus zwei Instanzen des Web-Servers und aus einem 
Loadbalancer bestehen. Fügen Sie folgenden Inhalt ein (achten Sie auf die 
korrekte Einrückung):

    version: "3.9"
    
    services:
      web-app:
        build: .
        deploy:
          replicas: 2
      load-balancer:
        build: load-balancer
        ports:
          - 8080:8080

Die Datei definiert zuerst einen Service 'web-app'. Die Zeile `build: .` 
bedeutet, dass dieser Service durch das Dockerfile im selben Ordner definiert
ist. Es werden zwei _Replikas_ dieses Services erstellt, und Docker Compose
generiert automatisch sinnvolle Hostnamen für sie: 'apm-app_web-app_1' und
'apm-app_web-app_2'. Der Service ist allerdings nicht öffentlich erreichbar, 
sondern nur in einem Docker-internen Netzwerk. Die Idee dabei ist, dass die 
Web-App nur via Loadbalancer erreichbar ist.
Der Service 'load-balancer' ist hingegen über den Port 8080 öffentlich 
erreichbar und wird analog durch ein Dockerfile im Ordner 'load-balancer'
definiert. Dieses erstellen Sie als nächstes.

Erstellen Sie im Projektordner den Unterordner 'load-balancer' und darin zuerst 
eine Datei 'nginx.conf', welche die Loadbalancer-Konfigurationen enthält. 
Fügen Sie folgenden Inhalt ein:

    events {}
    http {
        upstream web-app {
            server apm-app_web-app_1:8080;
            server apm-app_web-app_2:8080;
        }
        server {
            listen 8080;
            location / {
                proxy_pass http://web-app;
            }
        }
    }

NGINX wird damit so konfiguriert, dass er auf dem Port 8080 Anfragen 
entgegen nimmt und diese als _Reverse Proxy_ an die Web-Server weiterleitet.

Erstellen Sie als letztes ein neues Dockerfile im Order 'load-balancer' und 
geben Sie folgenden Inhalt ein:

    FROM nginx:latest
    COPY nginx.conf /etc/nginx/nginx.conf

Damit erweitern wir das vordefinierte 'nginx'-Image mit unserer eigenen 
Konfiguration. Die Images 'nginx' und auch 'openjdk:11-jre-slim-buster' 
werden übrigens automatisch von [Docker Hub](https://hub.docker.com/) 
heruntergeladen.

Jetzt können Sie die skalierte App starten, indem Sie im Hauptordner 
folgenden Befehl auf der Kommandozeile ausführen (oder in IntelliJ in der 
'docker-compose.yml'-Datei das Doppel-Play-Symbol links drücken):

    docker-compose up

Wenn Sie jetzt [localhost:8080](http://localhost:8080) wiederholt aufrufen, 
sollten Sie den Effekt des Loadbalancers sehen können: Die Anfragen werden 
abwechslungsweise durch den einen und den anderen Web-Server beantwortet.
NGINX verwendet standardmässig eine _Round-Robin_-Methode zum Verteilen der 
Anfragen.


### 4. Persistenz

_Round-Robin_ ist nicht besonders nützlich, wenn ein Client über mehrere 
Requests hinweg mit demselben Server kommunizieren soll. Informieren Sie 
sich in der [NGINX-Dokumentation](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/#choosing-a-load-balancing-method)
über die unterstützten Loadbalancing-Methoden und konfigurieren Sie 
NGINX dann mit der _IP-Hash_-Methode. Ändern Sie dazu die 'nginx.conf'-Datei.
Docker Compose macht es Ihnen einfach, diese Änderung zu deployen:

    docker-compose up --build

Dieser Befehl builded beide Docker-Images neu (nur die geänderten Teile), 
stoppt die laufenden Services und startet sie mit den neuen Images wieder. 
Jetzt sollten Ihre Anfragen immer auf dem selben Server landen.

Die Docker-Unterstützung von IntelliJ beinhaltet übrigens ein grafisches 
Interface, um solche Docker- oder Docker-Compose-Befehle auszuführen; Sie finden
es im Tab 'Services' in der unteren Leiste.


### 5. Fehlertoleranz

Ein Nebeneffekt von Loadbalancing ist, dass wir eine einfache Form von 
Fehlertoleranz erhalten. NGINX führt automatisch passive Health Checks durch 
und markiert Server, welche eine Zeit lang nicht geantwortet haben, als nicht
verfügbar.

Informieren Sie sich in der
[Dokumentation](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-health-check/#passive-health-checks)
über die Konfigurationsmöglichkeiten und stellen Sie das Monitoring so ein, 
dass ein Server bereits nach 3 Sekunden als nicht verfügbar markiert wird.

Starten Sie die Applikation neu und überprüfen Sie, dass die Fehlertoleranz 
funktioniert, indem Sie abwechslungsweise einen der Web-Server stoppen und 
die Seite im Browser wiederholt neu laden. 
Verwenden Sie folgende Kommandozeilen-Befehle oder das Interface von 
IntelliJ um laufende Container aufzulisten und einzelne davon zu stoppen 
oder wieder zu starten:

    docker ps
    docker stop apm-app_web-app_1
    docker start apm-app_web-app_1
