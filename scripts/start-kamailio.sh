#!/bin/bash
echo "Starting Kamailio SIP proxy..."
docker run -d --name kamailio-proxy -p 5060:5060/udp kamailio/kamailio:latest || true
