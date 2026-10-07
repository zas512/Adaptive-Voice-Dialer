# JsSIP Setup for React Dialer

## 1. Configure SIP Account
Edit settings: host (sip.example.com), port (5060), extension, secret.

## 2. WebSocket Connection
JsSIP requires WSS (secure). Configure reverse proxy (nginx) to forward wss://host/ws to Asterisk WS.

## 3. Registration Flow
```js
const ua = new JsSIP.UA({ sockets: [new JsSIP.WebSocket('wss://host/ws')], uri: 'sip:ext@host', authorization_user: 'ext', password: 'secret' });
ua.start();
ua.on('registered', () => console.log('Registered'));
ua.on('registrationFailed', (e) => console.log('Failed', e.cause));
```

## 4. Call Control
```js
const call = ua.call('sip:number@host');
call.on('accepted', () => console.log('Call accepted'));
call.on('ended', () => console.log('Call ended'));
```

## 5. Asterisk/FreeSWITCH Config
- `sip.conf`: define `[agent]` peer with host, secret.
- `extensions.conf`: dialplan for outbound/inbound.
- Kamailio: proxy SIP to Asterisk if scaling.
