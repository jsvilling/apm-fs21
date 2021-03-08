FROM nginx:latest
COPY nginx.conf /etc/nginx/nginx.conf
RUN apt update && apt -y install keepalived
ARG role
COPY keepalived-${role}.conf /etc/keepalived/keepalived.conf
RUN chmod -x /etc/keepalived/keepalived.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh
CMD ["/start.sh"]
