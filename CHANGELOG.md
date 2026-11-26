# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2026-11-25

### Added

- `.omp-plugin/marketplace.json`, so `omp plugin marketplace add wilfredocamacho/omp-cbm`
  exposes `omp-cbm@omp-cbm` without the full git URL.

### Changed

- `search_graph`, `read_symbol`, `read_symbols`, `search_and_read_symbols`,
  `search_code`, and `trace_path` are registered as `loadMode: "essential"`.
  Extension tools default to `discoverable`, which kept their schemas behind
  bash-mounted commands and a one-line catalog entry while `grep`, `read`, and
  `find` shipped top-level; the visible schemas now let them compete for use.
  The remaining tools stay discoverable to keep per-request schema cost down.
- The injected system prompt now states that codebase-memory tools missing from
  the tool list are bash commands reachable with `--help`.
- The marketplace entry no longer repeats the version; for a relative source,
  Oh My Pi reads `package.json`.
- The unsupported-version notice names `omp-cbm` instead of the upstream plugin.

### Fixed

- Removed a Bun-only import from Oh My Pi's streaming-output module, which loads
  a native addon at import time. The truncation helper is inlined.

### Compatibility

- Targets `@oh-my-pi/*` 19.2 and `codebase-memory-mcp` 0.12.x
  (`>=0.12.0 <0.13.0`).

## [2.0.0] - 2026-10-25

### Added

- Port from `pi-cbm` to Oh My Pi 19.2 (`@oh-my-pi/pi-ai`,
  `@oh-my-pi/pi-coding-agent`, `@oh-my-pi/pi-tui`).
- Support for the `codebase-memory-mcp` 0.12 `{cols, groups, rows}` table
  payloads: `src/cbm/tables.ts` flattens them into records, rebuilds
  `qualified_name` from `qn_prefix`, and splits lines into start/end.
- Background indexing requires an actual change since the graph was taken,
  re-checks under the repo lease when another index finished meanwhile, and
  backs off while waiting on another session's lease.
- Per-client version gate that tells the user when the installed
  `codebase-memory-mcp` is unsupported, and fails graph tools with that message
  instead of returning empty results.
- Batch tools `get_code_snippets`, `read_symbols`, and `search_and_read_symbols`.

### Changed

- `src/pi-tools` renamed to `src/cbm-tools`; the extension manifest uses the
  `omp` key.
- Prompt guidance is injected once through `before_agent_start`;
  `promptSnippet`/`promptGuidelines` are gone because Oh My Pi never passes
  them to the model.
- Tool renderers return plain strings; `pi-tui` has no `Text` component.
- Every CLI call requests `format=json`.
- `PI_CBM_*` variables are the only accepted names, and they win over the
  legacy `CBM_*` ones, which now produce a one-time warning.
- `trace_path` keeps `status` and `suggestions` from ambiguous-name responses,
  and `detect_changes` keeps impacted symbols, modules, and counts.

### Removed

- The unused `normalizePathForDisplay` helper.

[2.0.1]: https://github.com/wilfredocamacho/omp-cbm/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/wilfredocamacho/omp-cbm/releases/tag/v2.0.0
