This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Demo users

Set `MONGODB_URI` and `AUTH_SECRET` in `.env.local`, then run:

```bash
npm run seed
```

Generate an `AUTH_SECRET` with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Sign-in uses `POST /api/auth/login` to issue a bearer token. The browser keeps
the session in local storage and sends the token with API requests. Each device
can sign in independently; signing out clears only that browser's session.

This creates or updates these three accounts:

| Role | Email | Default password for new accounts |
|---|---|---|
| Admin | `admin@example.com` | `password123` |
| Agent | `zainalis.914@gmail.com` | `password123` |
| Agent | `user@example.com` | `password123` |

Seeding updates each listed account's name, role, phone number, extension,
SIP host, port, and SIP secret. It does not change passwords for accounts that
already exist. Profile fields (except the SIP secret) are returned by the sign-in API.
The session is checked against the current user record when the browser opens,
so role and profile changes take effect without signing out and back in.

The seed command refuses to run when `NODE_ENV=production`. The default
password is for local testing only; change it before using a new seeded account
outside a development environment.

## Call logs

The dialer saves each SIP call when it ends or fails. `POST /api/user/call-logs`
stores the bearer-authenticated user's SIP session ID, phone number, inbound/outbound
type, call state, cancellation reason, hangup originator, start/answer/end
timestamps, and connected duration in MongoDB. The user ID is taken from the
authenticated session rather than the request body. `GET /api/user/call-logs`
returns the latest 100 logs for that user.

## Profile and KYC records

`GET /api/user/profile` returns the authenticated user's profile without the SIP
secret. `PATCH /api/user/profile` updates the profile name and direct number;
email and SIP provisioning remain administrator-managed.

`GET`, `POST`, and `PATCH /api/user/kyc` list, create, and review client records
for the authenticated user. Records are scoped to that user, and review status
can be `pending-review`, `verified`, or `requires-action`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
