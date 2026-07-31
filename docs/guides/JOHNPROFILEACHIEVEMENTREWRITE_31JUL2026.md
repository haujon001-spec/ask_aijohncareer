# john_profile.json Achievement Rewrite — 31 Jul 2026

## What happened

User supplied 8 draft achievement bullets (AIA budget ×1, Merrill Lynch resiliency/HA ×4, Morgan Stanley VDI/Citrix ×3) and asked for a recruiter-quality, ATS-keyword-optimized rewrite to be appended into `src/data/john_profile.json`.

## Keyword source

Per user decision, keywords were drawn as a general ATS-friendly common denominator across all 20 files in `data_raw/jd/txt/`, not one specific target JD. A grep sweep across the corpus surfaced the most recurring terms: `compliance`, `cloud`, `architecture`, `governance`, `SLA`, `infrastructure`, `stakeholder management`, `automation`, `resilience`, `budget`, `SME`, `digital transformation`, `risk management`, `modernization`, `business continuity`, `incident management`, `escalation`, `cross-functional`, `change management`, `vendor management`, `critical service`. These were woven into the rewritten bullets alongside the original technical facts (MSCS, Citrix StoreFront, F5, NetScaler, etc.), which are not common JD vocabulary in this corpus but are load-bearing facts from the source resumes.

## Cross-check against existing data (per soul.md / `feedback_crosscheck_before_appending_profile_data`)

Before writing anything, each draft was checked against the existing profile:

- **AIA budget** — no existing HKD 28M figure anywhere; genuinely new. Added as both a new `major_achievements` card and a new `professional_experience` highlight line, alongside (not replacing) the existing generic budget-planning line.
- **Merrill Lynch resiliency/HA (×4)** — found to be a detailed expansion of one existing thin line, `"Redesigned server architecture to increase resiliency and achieve high availability"`. Per user decision, that line was **replaced** with 4 short, ATS-optimized sentences (MSCS file/print clusters, MSCS SQL clustering, web service load balancers, HA/DR hardware failover testing/validation). A companion consolidated `major_achievements` card was also added.
- **Morgan Stanley VDI/Citrix (×3)** — all three overlapped with existing highlights describing the same underlying facts from a different angle. Per user decision, these were **merged/enriched into the existing lines** rather than added as new near-duplicate lines:
  - M&A Wealth Management VDI conversion → enriched with the specific 600-FA Asia count and 15,000+ global FA scope.
  - VDI get-well program → enriched with the SME/onboarding-guideline detail.
  - Citrix StoreFront → enriched with the full local/regional/global failover architecture (native failover grouping, F5 LTM/GTM, NetScaler + Akamai Kona).
  - The existing `major_achievements` "Global Virtual Desktop & Application Get-Well Program" card was enriched to match; two new cards were added for the M&A conversion and the StoreFront failover architecture, since no existing cards covered those two facts.

## Backup and verification

- Backed up original to `src/data/john_profile.json.20260731_V1.bak` before any edit, per soul.md golden rule.
- `major_achievements` count: 54 → 58 (4 new cards).
- `professional_experience` company list unchanged (7 companies); JSON re-parsed clean after every edit (`json.load` verification).
