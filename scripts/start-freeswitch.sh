#!/bin/bash
echo "Starting FreeSWITCH..."
docker run -d --name freeswitch-voip -p 5060:5060/udp -v $(pwd)/config/freeswitch:/etc/freeswitch freeswitch/freeswitch:latest || true
