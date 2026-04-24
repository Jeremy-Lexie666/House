# Scripts

## Normalize current community catalog

```bash
node scripts/sync_community_catalog.js
```

This script:

- trims values
- removes duplicates
- sorts by district and community name

## About scraping a full Shenzhen catalog

I tested direct requests against a public community-listing page and the target site returned `403 Forbidden` in this environment, so a reliable full scrape is not wired up yet.

To finish a bulk import cleanly, use one of these inputs:

1. a manually exported CSV/Excel of Shenzhen communities
2. an allowed/open data source
3. a browser-authenticated export flow you want me to automate later

## Import Shenzhen communities from 房天下

```bash
node scripts/import_fang_communities.js
```

Useful flags:

```bash
node scripts/import_fang_communities.js --end-page=20
node scripts/import_fang_communities.js --start-page=200 --end-page=260 --delay-ms=100
```

This script:

- reads the public Shenzhen mobile community list from 房天下
- follows the same load-more endpoint used by the site
- extracts `district -> community name`
- merges the result into `data/communityCatalog.json`
