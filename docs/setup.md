# Setup Guide — VoIP with JsSIP

## Services
- Asterisk: SIP registrar + PBX. Config (`sip.conf`, `extensions.conf`) defines peers, contexts.
- FreeSWITCH: Alternative SIP server. Uses `sofia` profile + dialplan XML.
- Kamailio: SIP router / proxy (not PBX). Routes requests; pairs with Asterisk for scale.

## JsSIP Integration
```js
const ua = new JsSIP.UA({
  sockets: [ new JsSIP.WebSocket('wss://pbx.example:5066/ws') ],
  uri: 'sip:agent@pbx.example',
  authorization_user: 'agent',
  password: 'secret',
});
ua.start();
```

## Docker Compose Example
See `docker-compose.yml` (Asterisk + Kamailio + FreeSWITCH). Each exposes SIP ports (5060/UDP) and WebSocket (5066/WSS).
