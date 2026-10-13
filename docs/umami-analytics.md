# Umami analytics

The root layout loads `https://analytics.nonglabs.cloud/script.js` once with Next's
`afterInteractive` strategy. `UMAMI_WEBSITE_ID` is read after `connection()` at
request time; it is neither a `NEXT_PUBLIC_` variable nor baked into a Docker build.
Blank runtime configuration omits the tracker. Umami handles client-side route
changes; query strings and hashes are excluded from collection.

The supplied ID is stored in an encrypted GitHub repository secret named
`UMAMI_WEBSITE_ID`, rather than committed in source. The existing deployment job
passes it through encrypted SSH stdin. A validated UUID is written atomically into
the server `.env`, preserving other settings and using mode 600. Missing CI
configuration leaves existing server settings intact. Manual configuration and
disabling instructions are in `deploy/README.md`.

The ID remains visible in the rendered script element and analytics requests.
Environment configuration does not make a browser tracker ID secret from visitors.
See [Umami's tracker configuration](https://docs.umami.is/docs/tracker-configuration).

Verification: missing script/configuration helper reproduced before implementation.
317 unit tests passed; production build, sequential typecheck/lint and shell syntax
checks passed. A build made with an empty ID loaded the dummy ID when started with
that runtime setting, and preserved one script across desktop/mobile navigation.
Analytics requests were blocked during tests. All 110 disabled-runtime desktop/mobile
browser stories passed. Independent review of `fb6a0b3..e95e704` found no Critical,
Important or Minor issues; focused environment-helper checks passed independently.
Master `bc2c419d22e50752997da5b2819bfefc88aecee8` deployed successfully in
[workflow run 38447271886](https://github.com/MrWinRock/exile-atlas/actions/runs/38447271886).
Live tracker and pageview collector both returned HTTP 200; the script and payload
matched the supplied runtime ID, and the verification query/hash were excluded.
Both desktop/mobile production navigation stories passed with collection blocked
for those regression tests. One real pageview was sent for collector acceptance.
