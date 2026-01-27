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

## AI profile pictures (OpenAI + Replicate)

This app can generate consistent leader **profile pictures** by:

- Using **OpenAI** to turn a leader’s JSON into a *style-consistent* image prompt
- Using **Replicate** to run `google/nano-banana-pro` to generate the image

## AI intro videos (Replicate Kling v2.6)

This app can also generate a cohesive ~10s **intro video** per leader by:

- Using a **strict, shared trailer style guide** (so videos look consistent across leaders)
- Using the leader’s **profile photo as a reference image** to keep identity consistent
- Using **Replicate** to run `kwaivgi/kling-v2.6`

### Usage

Open any leader and click **Generate intro video**. The returned URL is saved into that leader’s `welcomeVideoUrl` in localStorage and will replace the placeholder in the profile page.

### Environment variables

1) Copy `env.example` → `.env.local` (don’t commit `.env.local`)

2) Fill in:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (defaults to `gpt-5-nano-2025-08-07`)
- `REPLICATE_API_TOKEN`

## Supabase (DB persistence)

This app can also persist generated Leaders / Avatars / Trailers / Chat logs into Supabase.

### Supabase setup

- Create a new Supabase project
- In **SQL Editor**, run `supabase/schema.sql`

### Supabase environment variables

Add to `.env.local`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (optional today; useful later if you want browser-side reads)
- `SUPABASE_SERVICE_ROLE_KEY` (**server-only**; never expose to the browser)

### Install dependency

```bash
npm i @supabase/supabase-js
```

### Usage

Open any leader and click **Generate pic**. The returned URL is saved into that leader’s `profilePicUrl` in localStorage.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
