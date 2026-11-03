# EwapEvents Frontpage

Marketing site for **EwapEvents** (EWAP — Extreme Weather Action Platform).

Static HTML/CSS/JS, served by nginx in Docker. Designed for Portainer behind a Cloudflare Tunnel.

## Local

```bash
docker compose up --build
# → http://localhost:8080
```

Of serve `public/` met elke static file server.

## Stack

| Pad | Rol |
| --- | --- |
| `public/` | Alles wat de browser ziet |
| `default.conf` | nginx + security headers + CSP |
| `Dockerfile` / `docker-compose.yml` | Container-first deploy |

## SEO / GEO / security surface

| Bestand | Doel |
| --- | --- |
| `public/robots.txt` | Crawl + sitemap + AI bots allow |
| `public/llms.txt` (+ `llm.txt`) | LLM/GEO product summary |
| `public/.well-known/security.txt` (+ `/security.txt`) | Vulnerability contact (RFC 9116) |
| `public/sitemap.xml` | Index |
| JSON-LD in `index.html` | Organization, SoftwareApplication, FAQPage |

## Interactieve staffels

De homepage heeft een wind-%-slider en S0–S3 knoppen. Kleuren volgen het ECC staffel-model uit het EWAP-product (groen / geel / oranje / rood).

## Domains

- Marketing: `https://ewapevents.nl`
- App CTAs: `https://app.ewapevents.nl`

## Deploy

Build/push image of mount `public/` in een nginx-container via Portainer. Geen SaaS-buildstap vereist.
