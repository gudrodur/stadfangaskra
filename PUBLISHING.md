# Publishing to npm

**Status (2026-06-21):** Sveinbjörn Þórðarson (author of `iceaddr`) has replied
and given his blessing to publish, with no attribution required beyond the BSD-3
notice already kept for the postcode data (see `docs/outreach-sveinbjorn.md`). The
package is named `iceaddr-ts` to make the lineage clear. Not on npm yet — ready to
publish when you give the word.

## Checklist

1. Confirm the name is free:
   ```sh
   npm view iceaddr-ts
   ```
   If taken, fall back to a scoped name (`@gudrodur/iceaddr-ts`) and update
   `name` in `package.json`.
2. Log in: `npm login`.
3. Verify the build + tests are green:
   ```sh
   pnpm run build && pnpm run check
   ```
4. Dry-run to inspect the tarball contents (should be `dist/` + `NOTICE.md` +
   `README.md` + `LICENSE` only):
   ```sh
   npm publish --dry-run
   ```
5. Publish:
   ```sh
   npm publish --access public
   ```
6. Tag the release:
   ```sh
   git tag v0.1.0 && git push --tags
   ```

## After publishing

- Point the `xj-greenfield` monorepo's `@xj/shared` at the published package (or
  keep the local copy) — tracked in `xj-greenfield` issue #491.
- Consider a short post / link from the `iceaddr` README (coordinate with
  Sveinbjörn / Jökull).
