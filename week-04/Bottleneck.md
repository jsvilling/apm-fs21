# APM Woche 4: Performance messen

**Vorsicht Spoiler**: Hier bekommen Sie ein paar zusätzliche Hinweise, falls
Sie beim Identifizieren oder Beheben des ersten Bottlenecks nicht
weiterkommen. Versuchen Sie es aber zuerst selber, indem Sie mit einem 
Stresstest die Last so lange erhöhen, bis die Applikation unzuverlässig oder 
unbrauchbar wird, und dann anhand der Container-Logs und entsprechender 
Online-Dokumentation versuchen herauszufinden, wie das Problem zu beheben ist.


## Bottleneck Beheben

Mit grosser Wahrscheinlichkeit ist das erste Bottleneck, auf das Sie stossen,
die Anzahl "worker connections" der NGNIX-Server, d. h. des 
Entry-Point-Servers (falls verwendet) und des aktiven Loadbalancers. Sobald 
Sie gegen 500 gleichzeitige Anfragen machen, sollten im NGINX-Log folgende 
Meldungen häufiger werden:

    [alert] 32#32: 512 worker_connections are not enough

Der Artikel [Tuning NGINX for Performance](https://www.nginx.com/blog/tuning-nginx/#Tuning-Your-NGINX-Configuration)
gibt einen kurzen Überblick über die relevanten Einstellungen. Zwei 
Anweisungen in der NGINX-Konfigurationsdatei können angepasst werden:
* [`worker_processes`](https://nginx.org/en/docs/ngx_core_module.html#worker_processes):
  Diese Anweisung beeinflusst die Anzahl Prozesse (und somit CPUs), welche 
  für die Verbindungen verwendet werden. Der Default-Wert ist 1. *Diese 
  Anweisung muss im "äussersten" Teil (ganz oben) der Konfigurationsdatei 
  stehen.*
* [`worker_connections`](https://nginx.org/en/docs/ngx_core_module.html#worker_connections):
  Bestimmt die Anzahl Verbindungen *pro Worker*. Der Default-Wert ist 512. 
  Zusammen mit dem oberen Default-Wert von 1 bedeutet das, dass nur 512 
  gleichzeitige Verbindungen möglich sind, was schnell zu wenig werden kann 
  (je nach Verbindungseinstellungen des Lastgenerators). *Diese Anweisung 
  muss im `events`-Teil der Konfigurationsdatei stehen.*

Verwenden Sie diese Anweisungen um das NGINX-Bottleneck zu "verbreitern" und 
führen Sie dann Ihre Experimente mit dem verbesserten Setup fort.