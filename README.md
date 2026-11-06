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

After setting `MONGODB_URI` in `.env.local`, run:

```bash
npm run seed
```

This creates or updates these three accounts:

| Role | Email | Default password for new accounts |
|---|---|---|
| Admin | `admin@example.com` | `password123` |
| Agent | `zainalis.914@gmail.com` | `password123` |
| Agent | `user@example.com` | `password123` |

Seeding updates each listed account's name, role, phone number, extension,
SIP host, port, and SIP secret. It does not change passwords for accounts that
already exist. Profile fields (except the SIP secret) are included in the
NextAuth session when the user signs in; sign out and back in to refresh it.

The seed command refuses to run when `NODE_ENV=production`. The default
password is for local testing only; change it before using a new seeded account
outside a development environment.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
