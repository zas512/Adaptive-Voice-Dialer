#!/bin/bash
# Start Asterisk service (requires asterisk package installed)
echo "Starting Asterisk..."
docker run -d --name asterisk-voip -p 5060:5060/udp -p 5066:5066/tcp -v $(pwd)/config/asterisk:/etc/asterisk asterisk:latest || echo "Run with docker-compose for full setup"
