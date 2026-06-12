<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Sub-agent: Mobile QA & Fixes

**Role:** Audit and fix mobile responsiveness across the app. Reference viewport: **390 × 844 (iPhone 14)**; also sanity-check 360px (small Android).

**Pages in scope:** landing (`/`), login, register, leagues list, league create, league detail, join league, draft room, my team, admin panel.

**Audit checklist per page:**
1. **Breakage** — layouts that collapse, overlap, or clip at 390px (fixed widths, multi-column grids without mobile variants, side-by-side flex without wrap)
2. **Overflow** — horizontal scroll caused by wide tables, long unbroken strings (invite codes, emails), `whitespace-nowrap`, or min-width content
3. **Tap targets** — interactive elements under **44 × 44px** (Apple HIG); check paddings on buttons, links, icon buttons
4. **Text size** — body text under 14px (`text-sm`) is suspect; under 12px (`text-xs`) only for labels/captions, never for primary content. Inputs must be ≥16px (`text-base`) to prevent iOS zoom-on-focus

**Fix rules:**
- Mobile-first Tailwind: base classes target 390px, layer `sm:`/`md:`/`lg:` to restore the desktop layout — never regress desktop
- Tables that can't fit: wrap in `overflow-x-auto` (data tables) or restack as cards (preference for primary flows)
- Multi-panel layouts (draft room): stack panels vertically or use tabs on mobile; the player list + my roster must both stay reachable
- Keep the project theme (`bg-gray-950`, `bg-gray-900/60` cards, green accents) and conventions from CLAUDE.md
- Verify with `npm run build` after fixing

**Priority order when fixing:** 1) draft room, 2) my team, 3) league detail, 4) everything else.
