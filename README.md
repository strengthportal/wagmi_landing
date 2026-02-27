# WAGMI Landing

Marketing site, blog, and landing pages for [wagmi.fit](https://wagmi.fit).

## Stack

- [Astro 5](https://astro.build) — static site framework
- [Tailwind CSS v4](https://tailwindcss.com) — utility-first styling via `@tailwindcss/vite`
- [React](https://react.dev) — for interactive islands
- [@tailwindcss/typography](https://tailwindcss.com/docs/typography-plugin) — blog prose styles
- [@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/) — auto-generated sitemap
- [@astrojs/rss](https://docs.astro.build/en/guides/rss/) — RSS feed
- [Iconify (Solar)](https://icon-sets.iconify.design/solar/) — icons via CDN

## Project Structure

```
src/
├── content.config.ts          # Astro 5 Content Layer schema
├── content/blog/              # Blog posts (.md)
├── layouts/
│   ├── BaseLayout.astro       # Base HTML shell with SEO meta
│   └── BlogPostLayout.astro   # Blog post wrapper
├── components/
│   ├── Header.astro
│   ├── Footer.astro
│   └── landing/
│       ├── Hero.astro
│       ├── LogoCloud.astro
│       ├── HowItWorks.astro
│       ├── Features.astro
│       └── CTA.astro
├── pages/
│   ├── index.astro            # Landing page
│   ├── rss.xml.ts             # RSS feed
│   └── blog/
│       ├── index.astro        # Blog listing
│       └── [slug].astro       # Blog post
└── styles/
    └── global.css             # Tailwind + custom animations
```

## Development

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # output to dist/
npm run preview   # preview the build locally
```

## Adding a Blog Post

Create a new `.md` file in `src/content/blog/` with this frontmatter:

```markdown
---
title: "Your Post Title"
description: "A short description for SEO and previews."
pubDate: 2026-03-01
author: "WAGMI Fitness"
tags: ["coaching", "workflow"]
draft: false
---

Post content here...
```

Set `draft: true` to keep a post out of the build.
