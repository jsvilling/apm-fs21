# APM Woche 5: Caching


[Vorlesungsfolien](Caching.pdf)


## Übung

In der letzten Übung haben Sie getestet, wie belastbar die verteilte Web-App 
ist, die Sie zuvor aufgesetzt haben. Sie haben hoffentlich verschiedene 
Szenarien ausprobiert und festgestellt, dass die Antwortzeit mit zunehmender 
Last ziemlich schnell wächst, vor allem, wenn die Ressourcen für die 
Web-Server stark eingeschränkt werden (z. B. `cpus: '0.2'`).
In dieser Übung überprüfen Sie, wie Sie mit Caching die App performanter bzw.
belastbarer machen können, zum einen mit einer eigenen Cache-Implementation 
für den Hazelcast-Speicher und zum anderen mit dem Caching-Feature von NGINX.


### 1. Ein Cache für die Cluster-Storage

Der verteilte Hazelcast-Speicher ist relativ effizient, aber wenn Sie eine 
grössere Anzahl Server haben, ist viel Kommunikationsaufwand für die 
Synchronisation der Daten nötig. Überprüfen Sie, ob Sie die Antwortzeiten 
verbessern können, indem Sie einen Cache davor schalten.

In dieser Übung können Sie davon ausgehen, dass Sie über perfekte Stickyness 
bei den Web-Server verfügen, das heisst, dass Sie sich keine Gedanken um 
verteilte Cache-Invalidierung machen müssen. Schreiben Sie also einen Cache, 
der die Lesezugriffe unabhängig auf jedem Web-Server beschleunigt, indem er die 
aus der Cluster-Storage gelesenen Werte lokal zwischenspeichert.

Schreiben Sie eine Klasse `CachedStorage`, welche das `Storage`-Interface 
implementiert. Die Klasse soll einen Konstruktor `CachedStorage(int cacheSize,
Storage storageToBeCached)` haben und bei einem Cache-Miss den Wert aus dem 
`storageToBeCached` laden. Entscheiden Sie sich dann für eine (oder mehrere) 
im Unterricht besprochene Cache Replacement Policy und implementieren Sie diese.


### 2. Effektivität messen

Versuchen Sie, die Effektivität Ihres Caches mithilfe von JMeter zu messen. 
Führen Sie dazu einen geeigneten Testplan einmal mit der alten Version der 
App durch, deployen Sie dann die neue `CachedStorage`-Version Ihrer App, 
führen Sie den Testplan erneut aus und vergleichen Sie die Resultate.

Beachten Sie, dass die Resultate stark davon anhängen kann, auf welche Keys 
Sie zugreifen (und auf welchem Web-Server eine Anfrage landet). Wie in der 
Vorlesung gezeigt, können Sie einen JMeter-Testplan um kleine
[Scripting-Elemente](https://jmeter.apache.org/usermanual/component_reference.html#BeanShell_Sampler)
und [Funktionen und Variablen](https://jmeter.apache.org/usermanual/functions.html))
erweitern. Testen Sie z. B. das Verhalten, wenn Sie im Verlauf des Testplans 
auf 100, 1000 oder 10 000 verschiedene Keys zugreifen und mit 
unterschiedlichen Konfigurationen für die Web-Server (Anzahl, CPU-Limits). 
Testen Sie vielleicht auch den Einfluss der Cache-Grösse.

**Wichtig**: Da sich die Caches während des Ausführens eines Testplans füllen, 
kann das beobachtete Verhalten stark davon abhängen, ob Sie die Web-Server
frisch gestartet haben (und die Caches zu Beginn leer sind) oder ob die 
Caches noch Daten von früheren Testplan-Ausführungen enthalten.


### 3. Caching mit NGINX

Eine andere Möglichkeit, die Performance des Web-App zu verbessern, ist 
externes Caching, in unserem Fall durch die NGINX-Loadbalancer. Informieren 
Sie sich in [diesem Artikel](https://www.nginx.com/blog/nginx-caching-guide/)
über die Möglichkeiten, die NGINX Ihnen bietet, und implementieren Sie einen 
Cache, der die `GET`-Anfragen an den Key–Value-Store zwischenspeichert. Dazu 
ändern Sie wiedermal die 'nginx.conf'-Datei der Loadbalancer. Beachten Sie, 
dass alle Anweisungen in dem Artikel innerhalb des `http`-Blocks (bzw. 
innerhalb des `location`-Blocks) stehen müssen.

Was aus dem Artikel nicht klar hervorgeht, ist dass teilweise die Option 
[proxy_cache_valid](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache_valid)
nötig ist, um den Cache zu aktivieren. Das hängt damit zusammen, ob der 
Web-Server Cache-relevante HTTP-Header zu den Antworten hinzufügt. Verwenden 
Sie folgende Anweisung, um den Cache für Antworten mit dem HTTP-Status 200 zu 
aktivieren:

    proxy_cache_valid 200 10m;

Die Anweisung muss im `location`-Block der Konfiguration stehen. Die Option 
`10m` bedeutet, dass die Inhalte im Cache während 10 Minuten gültig sind.

Um zu überprüfen, ob der Cache funktioniert, erlaubt es NGINX Ihnen, 
zusätzliche Header zu den HTTP-Antworten hinzuzufügen, welche angeben, ob 
eine Anfrage aus dem Cache kommt (`HIT`) oder vom Web-Server geholt werden 
musste (`MISS`). Fügen Sie dazu folgende Anweisung in den `http`-Block ein:

    add_header X-Cache-Status $upstream_cache_status;

Verwenden Sie `curl` oder die Entwicklertools in einem Browser wie Firefox 
oder Chrome um die Header der empfangenen HTTP-Antworten zu sehen.

Versuchen Sie wiederum, mit JMeter Unterschiede in den Antwortzeiten 
festzustellen. Um Feedback zu Ihrer Cache-Implementation oder zu 
Ihren Messresultaten zu bekommen, schicken Sie mir die entsprechende Java-Datei
bzw. ein PDF-Dokument und eine JMX-Datei per E-Mail zu.