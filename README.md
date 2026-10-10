# Heelsfreak Hub — online store

Shoe and bag store with an admin panel. Customers browse, add to bag, check out, and get your mobile money details plus a WhatsApp button that sends you their order. No payment is taken on the site.

## What's in this folder

| Path | What it is |
| --- | --- |
| `index.html`, `assets/` | The store and admin panel |
| `images/` | Your product photos, logo and home page photo |
| `favicon.ico`, `icon-*.png`, `site.webmanifest` | Browser tab icon and phone home-screen icon |
| `data/store.json` | Starting products and settings |
| `netlify/functions/` | Saves admin changes and uploaded photos (Netlify Functions + Netlify Blobs) |
| `netlify.toml`, `package.json` | Netlify configuration |

## Option A: quick preview (drag and drop, no saving)

1. Go to https://app.netlify.com/drop
2. Drag this whole folder (unzipped) onto the page.

The shop, checkout and payment page all work. Netlify doesn't run functions on drag-and-drop deploys, so the admin runs in **preview mode**: you can try it, but changes only stay in your browser. Its "Download store.json" button gives you a file to replace `data/store.json` with before you deploy again.

## Option B: the full store with a working admin (recommended)

Use either GitHub or the Netlify CLI. Both run the functions, so the admin saves for real.

**With GitHub**
1. Create a GitHub repository and upload everything in this folder.
2. In Netlify: Add new site → Import an existing project → pick the repository. Leave the build settings as they are and deploy.

**With the Netlify CLI** (on a computer with Node.js 18+)
```
npm install -g netlify-cli
cd heelsfreak-hub
netlify login
netlify deploy --prod
```

**Then set your admin password (required):**
Netlify → your site → Site configuration → Environment variables → Add variable
- Key: `ADMIN_PASSWORD`
- Value: a long password only you know

Redeploy once (Deploys → Trigger deploy) so the functions pick it up.

## Using the admin

Open `https://your-site.netlify.app/#admin`, or tap **Shop admin** at the bottom of the store, and sign in with `ADMIN_PASSWORD`.

- **All products**: edit, hide, move up, delete.
- **Add new product**: name, description, photos (first is the cover), price and sale price, category, sizes, badge, stock.
- **Store settings**: name, tagline, logo, home photo, phone numbers, WhatsApp number, payment accounts, payment instructions, delivery options.
- **Publish changes** makes your edits live for customers.

Until your first publish, the store shows the starting products from `data/store.json`. After that, the live data lives in Netlify Blobs, and the previous version is kept as a backup (`store-previous`).

## Before you share the link

- Set real prices (the starting ones are placeholders).
- Check the MoMo number and account name in Store settings. Customers send money there.
- Set delivery fees if you have fixed ones.

## Custom domain

Netlify → Domain management → Add a domain.
