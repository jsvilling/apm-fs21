#!/bin/bash
rm -fr /var/run/keepalived.pid
keepalived -nl &
nginx -g "daemon off;"
