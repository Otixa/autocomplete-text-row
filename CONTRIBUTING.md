# Contributing

Contributions are welcome. This document describes how to report problems and submit changes.

## Reporting issues

Use the [issue forms](https://github.com/Otixa/autocomplete-text-row/issues/new/choose). Before reporting a bug, update to the latest release and hard-reload the browser; many display problems come from a cached copy of an older version.

## Development

The repository has no build step and no dependencies. `autocomplete-text-row.js` is the file that ships.

Requirements: Node.js 20 or newer, for the tests only.

```bash
npm run check   # syntax check
npm test        # unit tests
```

The matching and suggestion logic is exported as pure functions (`matchOptions`, `listItems`, `canonical`, `collectOptions`, `highlightParts`, `mergeRanges`, `normalise`) and covered by `test/matching.test.js`. Changes to that logic should come with tests.

To try the row without Home Assistant, serve the repository root over HTTP and open `demo/index.html` (append `?state=open` to render the list open). To try it in Home Assistant, copy the file to `<config>/www/` and add it as a dashboard resource with a new `?v=` value.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Keep each pull request to a single change.
3. Run `npm run check` and `npm test`.
4. Update `README.md` if you add or change an option.
5. Add a line to the unreleased section of `CHANGELOG.md`, creating the section if needed.

Code style follows the existing file: plain ES2022, no framework, styles scoped to the shadow root, and only Home Assistant theme variables for colours.

## Releases

Releases are made by the maintainer by pushing a `v<version>` tag. See [Releasing](README.md#releasing).
