# WAGMI Fitness — Brand Guidelines

> Use this document as context when generating landing pages, UI components, and marketing assets for WAGMI Fitness.

---

## 1. Brand Overview

**Company Name:** WAGMI Fitness
**Domain:** wagmi.fit (redirects from wagmifit.com and wagmifitness.com)
**Tagline Options:**
- "We're All Gonna Make It"
- "Type fast. We'll handle the rest."
- "The fastest way to program your clients."

**What We Are:** The fastest way for personal trainers to build client programs. Type how you naturally think — messy, fast, shorthand — and WAGMI structures it, cleans it up, and makes it client-ready. No templates. No friction. Just type and go.

**What We Are NOT:** A prompt interface. Not a chatbot. Not a "describe your program and AI generates it" tool. We're a speed layer — trainers already know what they want to program. We just remove every second of friction between their brain and a polished client-facing product.

**Target Audience:** Independent personal trainers (online and in-person) with 1–50 clients. Skews younger (25–38), internet-native, comfortable with modern tools, and looking for speed over feature bloat.

**Brand Origin:** "WAGMI" comes from "We're All Gonna Make It" — a rallying cry for people putting in the work. It's optimistic, community-driven, and action-oriented. It captures the trainer-client relationship perfectly: we rise together.

---

## 2. Brand Personality & Voice

### Personality Traits
- **Confident, not arrogant** — We know we're building something new. We say it plainly.
- **Fast, not sloppy** — Speed is a core value. The product is fast. The brand feels fast.
- **Smart, not intimidating** — AI-powered under the hood, dead simple on the surface.
- **Community-oriented** — Trainers and clients succeed together.
- **Modern and approachable** — Clean, current, with subtle personality. Professional but never corporate.

### Voice Guidelines
- Write in short, direct sentences. No fluff.
- Use "you" and "your" — speak to the trainer directly.
- Lead with speed and simplicity, not technology.
- AI is the engine, not the selling point. Trainers care about saving time, not how it works under the hood.
- Avoid corporate buzzwords: "synergy," "leverage," "revolutionize," "disrupt."
- Avoid AI hype words: "prompt," "generate," "describe to AI," "AI-powered" as a headline.
- Allowed to be casual with subtle personality, but never cringey or try-hard.

### Example Copy

**Primary headlines (use these first):**
- ✅ "From rough notes to client-ready in seconds."
- ✅ "The fastest workout programming tool on the market."
- ✅ "You think it. Your client has it."

**Supporting copy:**
- ✅ "Stop formatting. Start coaching."
- ✅ "Type like you're scribbling on a whiteboard. We make it beautiful."
- ✅ "30 seconds of typing. A polished program in your client's hands."
- ✅ "Your clients get a polished app. You just typed for 30 seconds."
- ✅ "Program 10 clients in the time it takes to program one."
- ✅ "Built for trainers who already know what to program — and hate how long it takes."
- ✅ "Less clicking. Less formatting. More coaching."

**Never use:**
- ❌ "Describe your program and let AI generate it." (We are NOT a prompt interface)
- ❌ "Enter a prompt to create a workout." (No prompt UX — just typing)
- ❌ Any copy that implies a chatbot, prompt box, or "AI generates your program for you"
- ❌ "Revolutionizing the fitness industry with cutting-edge AI solutions."

---

## 3. Visual Identity

### Color Palette

Built on [shadcn/ui](https://ui.shadcn.com/) conventions. Light mode is the default.

**Brand Colors:**
| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Indigo | `#4F46E5` | CTAs, primary buttons, key accents |
| Primary Foreground | White | `#FFFFFF` | Text on primary buttons |
| Accent | Amber | `#F59E0B` | Highlights, badges, attention moments |
| Accent Secondary | Cyan | `#06B6D4` | Secondary accents, data viz, tags |

**shadcn Light Theme (default):**
| Role | Hex | Usage |
|------|-----|-------|
| `--background` | `#FFFFFF` | Page background |
| `--foreground` | `#0F172A` | Primary text (slate-900) |
| `--card` | `#FFFFFF` | Card backgrounds |
| `--card-foreground` | `#0F172A` | Card text |
| `--muted` | `#F1F5F9` | Muted backgrounds (slate-100) |
| `--muted-foreground` | `#64748B` | Secondary text (slate-500) |
| `--border` | `#E2E8F0` | Borders (slate-200) |
| `--input` | `#E2E8F0` | Input borders |
| `--ring` | `#4F46E5` | Focus rings (matches primary) |
| `--destructive` | `#EF4444` | Errors, destructive actions |
| `--success` | `#10B981` | Confirmations, completed states |

**shadcn Dark Theme (optional/toggle):**
| Role | Hex |
|------|-----|
| `--background` | `#0F0F11` |
| `--foreground` | `#FAFAFA` |
| `--card` | `#18181B` |
| `--muted` | `#27272A` |
| `--muted-foreground` | `#A1A1AA` |
| `--border` | `#27272A` |

### Light-Mode First
WAGMI Fitness defaults to **light mode** with an optional dark mode toggle. The light theme communicates clarity, professionalism, and approachability. Dark mode is available for user preference.

### Typography

**Primary Font:** Inter (Google Fonts)
- Headlines: Inter Bold / Semibold, large sizes (48–72px hero, 32–40px section headers)
- Body: Inter Regular / Medium, 16–18px
- Captions/labels: Inter Medium, 12–14px, uppercase tracking for labels

**Type Hierarchy:**
- Hero headline: 56–72px, Bold, tight line-height (1.1), text color `--foreground`
- Section headline: 32–40px, Semibold
- Subheading: 20–24px, Medium, `--muted-foreground`
- Body: 16–18px, Regular, line-height 1.6
- Small/caption: 12–14px, Medium

### Spacing & Layout
- Use generous whitespace. Let content breathe.
- Max content width: 1200px centered
- Section padding: 80–120px vertical
- Card padding: 24–32px internal
- Grid: 12-column, responsive
- Follow shadcn spacing conventions (space-1 through space-12)

### Borders & Radius
- Use shadcn default radius: `--radius: 0.5rem` (8px)
- Cards: rounded-lg (8px) or rounded-xl (12px)
- Buttons: rounded-md (6px)
- Borders: 1px solid `--border`

### Effects & Motion
- Subtle shadow on cards: `shadow-sm` or `shadow-md` in light mode
- Smooth hover transitions: 200ms ease
- Scroll-triggered fade-in animations (gentle, not dramatic)
- Primary CTA hover: slight lift (`translate-y-[-1px]`) + `shadow-lg`
- Keep it clean — no glow effects or glassmorphism in light mode

---

## 4. Iconography & Imagery

### Icons
- Use a clean, modern icon set: Lucide, Phosphor, or similar
- Icon weight: Regular or Light (not filled/heavy)
- Icon size: 20–24px inline, 32–48px for feature blocks
- Icon color: match text hierarchy (primary white, secondary gray)

### Imagery Style
- **No cheesy stock photos** of people flexing or high-fiving in gyms
- Prefer: UI screenshots/mockups, abstract gradient art, minimal lifestyle photography
- If showing people: real, diverse trainers in natural coaching settings — not posed
- Product screenshots should be presented in clean device mockups (phone + laptop)

### Illustrations
- Minimal, geometric, line-based illustrations if needed
- Match the indigo/cyan accent palette
- Used sparingly — the product UI is the hero visual

---

## 5. Landing Page Structure & Sections

The landing page should follow this general structure:

### Hero Section
- Large headline communicating speed and simplicity (not AI generation)
- Short supporting subhead (1–2 sentences)
- Single primary CTA button ("Get Early Access" or "Join the Waitlist")
- Visual: show a before/after of messy trainer input → polished client output, OR a clean product mockup. Do NOT show a prompt box, chat UI, or AI conversation interface.
- Trust signal: "Built by trainers, for trainers" or early user count

### Problem Statement
- Briefly articulate the pain: "You know exactly what to program. Your software just makes it take forever."
- The problem isn't that trainers need AI to think for them — it's that existing tools are slow, rigid, and full of friction
- 2–3 specific pain points: clunky template builders, too many clicks to do simple things, formatting busywork that adds zero coaching value

### Solution / How It Works
- 3-step visual showing the actual workflow: Type → Structured → Client-Ready
- Step 1: "Type how you think" — show messy, fast, shorthand input (e.g., "back squat 4x8, RDL 3x12, pull-ups 3xAMRAP")
- Step 2: "We structure it" — show the system organizing, formatting, adding context
- Step 3: "Client-ready instantly" — show the polished output delivered to the client's app
- CRITICAL: Do NOT show a prompt box, chat interface, or AI conversation. Show a fast text input that feels like typing notes — because that's what it is.
- The visual should feel like going from a coach's messy whiteboard scribble to a polished client experience in one step.

### Key Features (3–5 max)
- Fastest Programming Workflow — Type how you think, we structure it and make it client-ready instantly
- Smart Structuring — Our system parses messy shorthand into clean, organized programs automatically
- Client Management — Powerful tools to organize and track your clients
- Client Delivery — Clients get a clean, polished, branded experience on their device
- (Optional) Open Platform / API — Connect to your existing tools

### Social Proof / Trust
- Early access testimonials or waitlist count
- "From the team behind StrengthPortal" (if helpful for credibility)
- Logos or trust badges if applicable

### CTA / Waitlist
- Email capture form
- Clear value exchange: "Get early access before launch"
- Reinforce: "Free during beta" or "No credit card required"

### Footer
- wagmi.fit
- Social links (if active)
- Brief legal/copyright

---

## 6. Component Styling Reference

Use [shadcn/ui](https://ui.shadcn.com/) components as the foundation. Customize with brand colors.

### Buttons (shadcn Button variants)
```
Default (primary): bg-indigo-600, hover:bg-indigo-700, text-white, rounded-md
Secondary: bg-slate-100, hover:bg-slate-200, text-slate-900, rounded-md
Outline: border border-slate-200, hover:bg-slate-50, text-slate-900, rounded-md
Ghost: hover:bg-slate-100, text-slate-900
Destructive: bg-red-500, hover:bg-red-600, text-white
Size default: h-10 px-4 py-2
Size lg (CTAs): h-12 px-8 text-base font-semibold
```

### Cards (shadcn Card)
```
bg-white, border border-slate-200, rounded-xl, shadow-sm
Hover: shadow-md, transition-shadow duration-200
Padding: p-6
```

### Input Fields (shadcn Input)
```
bg-white, border border-slate-200, focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
rounded-md, h-10 px-3
Placeholder: text-slate-400
```

### Badges (shadcn Badge variants)
```
Default: bg-indigo-600, text-white, rounded-full, px-3 py-1, text-xs font-medium
Secondary: bg-slate-100, text-slate-900
Outline: border border-slate-200, text-slate-700
```

### Recommended shadcn Components
For the landing page, prefer these shadcn components where applicable:
Button, Card, Badge, Input, Separator, Accordion (for FAQ), Sheet (mobile nav), Toggle (dark mode)

---

## 7. Competitive Positioning (for copy context)

When writing landing page copy, position WAGMI Fitness against the market:

- **vs. Trainerize / TrueCoach / Everfit:** Click-heavy template builders from 2013–2018. WAGMI is faster by an order of magnitude — type and go.
- **vs. ChatGPT + Spreadsheets:** Trainers copy-paste between tools because nothing is connected. WAGMI is one workflow from brain to client.
- **vs. Enterprise platforms:** WAGMI is built for independent trainers, not gym chains. Fast, simple, affordable.

**Key differentiators to emphasize:**
1. Speed — the fastest workout programming workflow on the market
2. Type naturally — messy shorthand in, structured programs out
3. Zero formatting busywork — the system handles structure
4. Powerful client management without the bloat
5. Client-ready output instantly, not after 15 clicks

---

## 8. Do's and Don'ts

### Do
- Keep it clean and minimal — use shadcn defaults as the foundation
- Lead with speed and reduced friction as the core benefit
- Show the product early — real UI, not just marketing fluff
- Use concrete before/after examples (messy input → polished output)
- Make the page feel premium, fast, and trustworthy
- Use light mode as the default design
- Frame AI as invisible infrastructure — it powers the speed, but isn't the interface

### Don't
- Show a prompt box, chat interface, or AI conversation UI anywhere on the page
- Use "describe your program" or "enter a prompt" copy — this is NOT a chatbot
- Overload with features — less is more
- Use "revolutionary" or "game-changing" copy
- Show complex dashboards in the hero — show the simple magic moment
- Add unnecessary animations that slow the page down
- Over-style beyond shadcn defaults — consistency beats novelty
- Make it feel like an AI demo — it should feel like a fast, polished SaaS tool

---

*Last updated: February 2026*
*Version: 1.0*
