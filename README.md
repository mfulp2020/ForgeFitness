This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

## Clerk Auth Setup (Accounts)

ForgeFit uses Clerk for sign-in/sign-up.

### 1) Create a Clerk application

- Go to https://dashboard.clerk.com and create a new application.
- In the app’s settings, add these URLs:
	- **Allowed origins**: `http://localhost:3000`
	- **Redirect URLs** (or “Allowed redirect URLs”): `http://localhost:3000/*`

### 2) Add environment variables (local)

1. Create a `.env.local` file in the repo root.
2. Copy the template from `.env.local.example`.
3. Paste your Clerk keys from the Clerk dashboard:
	 - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
	 - `CLERK_SECRET_KEY`

Then restart the dev server (env vars are read at boot):

```bash
npm run dev -- -p 3000
```

### 3) Add environment variables (Vercel)

- Vercel Project → **Settings** → **Environment Variables**
- Add the same variables as above for **Production** (and Preview if you want).

### 4) Verify

- Visit `http://localhost:3000/sign-up`
- After signing up, you should land on `/forgefit`.

If you see “Missing publishableKey”, the `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` env var isn’t set or the dev server wasn’t restarted.

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
