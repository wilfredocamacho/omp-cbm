import { Type } from "typebox";
import type { ExtensionRender, ExtensionTheme } from "@oh-my-pi/pi-coding-agent";
import type { CbmClient } from "../cbm/client.js";
import type { OutputService } from "../domain/output.js";
import type { IndexingService } from "../domain/indexing.js";
import type { ToolExecutionContext } from "../domain/project-resolver.js";
import type { QueryService } from "../domain/query.js";
import type { SymbolService } from "../domain/symbols.js";
import type { TraceService } from "../domain/trace.js";
import type { CbmRuntimeSettings } from "../extension/runtime-settings.js";
import type { ToolTextResult } from "../cbm/result.js";
import { renderCall, renderResult } from "./render.js";
import {
  DIRECTION,
  EXPLORATION_OUTPUT_CONTROL_PARAMS,
  MAX_CONCURRENCY,
  METADATA_CONTROL_PARAMS,
  OPTIONAL_PROJECT,
  OUTPUT_CONTROL_PARAMS,
  SEARCH_CODE_MODE,
  SYMBOL_LABEL,
  SYMBOL_NEIGHBORS,
  SYMBOL_REQUEST,
  TIMEOUT_MS,
  TRACE_MODE,
} from "./schemas.js";

export type CbmServices = {
  cbm: CbmClient;
  indexing: IndexingService;
  output: OutputService;
  symbols: SymbolService;
  trace: TraceService;
  query: QueryService;
  settings: CbmRuntimeSettings;
};

export type ToolDefinition = {
  name: string;
  label: string;
  description: string;
  parameters: unknown;
  execute(params: Record<string, unknown>, services: CbmServices, ctx: ToolExecutionContext): Promise<ToolTextResult>;
  renderCall?: (args: unknown, options: unknown, theme: ExtensionTheme) => ExtensionRender | undefined;
  renderResult?: (result: { details?: Record<string, unknown> }, options: unknown, theme: ExtensionTheme) => ExtensionRender | undefined;
};

export const toolDefinitions: ToolDefinition[] = [
  {
    name: "search_graph",
    label: "CBM Search Graph",
    description: "Search the code graph for symbols and implementation locations: functions, methods, classes, routes, controllers, services, and related concepts.",
    parameters: Type.Object({
      project: OPTIONAL_PROJECT,
      query: Type.Optional(Type.String({ description: "Natural-language or keyword BM25 graph search." })),
      label: Type.Optional(Type.String()),
      name_pattern: Type.Optional(Type.String({ description: "Regex name pattern, e.g. .*Handler.*" })),
      qn_pattern: Type.Optional(Type.String()),
      file_pattern: Type.Optional(Type.String()),
      relationship: Type.Optional(Type.String()),
      min_degree: Type.Optional(Type.Number()),
      max_degree: Type.Optional(Type.Number()),
      exclude_entry_points: Type.Optional(Type.Boolean()),
      include_connected: Type.Optional(Type.Boolean()),
      semantic_query: Type.Optional(Type.Array(Type.String())),
      limit: Type.Optional(Type.Number({ default: 25 })),
      offset: Type.Optional(Type.Number({ default: 0 })),
      ...EXPLORATION_OUTPUT_CONTROL_PARAMS,
      timeout_ms: TIMEOUT_MS,
    }),
    execute: (params, services, ctx) => services.query.executeQueryTool("Graph search results", "search_graph", { limit: 25, ...params }, ctx),
    renderCall: renderCall("search_graph", (args) => String(args.query ?? args.name_pattern ?? args.semantic_query ?? "")),
    renderResult: renderResult("search_graph"),
  },
  {
    name: "resolve_symbol",
    label: "CBM Resolve Symbol",
    description: "Resolve a symbol name to compact candidate identities without returning source.",
    parameters: Type.Object({
      name: Type.String({ description: "Symbol name or qualified-name suffix to resolve." }),
      project: OPTIONAL_PROJECT,
      qualified_name: Type.Optional(Type.String({ description: "Exact or suffix qualified_name disambiguator." })),
      file_path: Type.Optional(Type.String({ description: "File path substring or suffix disambiguator." })),
      parent_class: Type.Optional(Type.String({ description: "Parent class name disambiguator for methods/classes." })),
      label: Type.Optional(SYMBOL_LABEL),
      route_path: Type.Optional(Type.String({ description: "Route path disambiguator, when indexed." })),
      route_method: Type.Optional(Type.String({ description: "Route HTTP method disambiguator, when indexed." })),
      limit: Type.Optional(Type.Number({ default: 20 })),
      ...METADATA_CONTROL_PARAMS,
      timeout_ms: TIMEOUT_MS,
    }),
    execute: (params, services, ctx) => services.symbols.resolve(params, ctx),
    renderCall: renderCall("resolve_symbol", (args) => String(args.name ?? args.qualified_name ?? "")),
    renderResult: renderResult("resolve_symbol"),
  },
  {
    name: "read_symbol",
    label: "CBM Read Symbol",
    description: "Resolve a symbol name and read its source only when the match is unambiguous.",
    parameters: Type.Object({
      name: Type.String({ description: "Symbol name or qualified-name suffix to resolve and read." }),
      project: OPTIONAL_PROJECT,
      qualified_name: Type.Optional(Type.String({ description: "Exact or suffix qualified_name disambiguator." })),
      file_path: Type.Optional(Type.String({ description: "File path substring or suffix disambiguator." })),
      parent_class: Type.Optional(Type.String({ description: "Parent class name disambiguator for methods/classes." })),
      label: Type.Optional(SYMBOL_LABEL),
      route_path: Type.Optional(Type.String({ description: "Route path disambiguator, when indexed." })),
      route_method: Type.Optional(Type.String({ description: "Route HTTP method disambiguator, when indexed." })),
      neighbors: Type.Optional(SYMBOL_NEIGHBORS),
      neighbor_limit: Type.Optional(Type.Number({ default: 10, description: "Maximum direct callers/callees to return per side when neighbors is enabled. Default 10." })),
      include_neighbors: Type.Optional(Type.Boolean({ description: "Compatibility alias for neighbors='both'." })),
      limit: Type.Optional(Type.Number({ default: 20 })),
      ...EXPLORATION_OUTPUT_CONTROL_PARAMS,
      timeout_ms: TIMEOUT_MS,
    }),
    execute: (params, services, ctx) => services.symbols.read(params, ctx),
    renderCall: renderCall("read_symbol", (args) => String(args.name ?? args.qualified_name ?? "")),
    renderResult: renderResult("read_symbol"),
  },
  {
    name: "get_code_snippet",
    label: "CBM Snippet",
    description: "Retrieve compact source for a known graph symbol by qualified_name.",
    parameters: Type.Object({
      qualified_name: Type.String({ description: "Full qualified_name from search_graph, or a short name if unambiguous." }),
      project: OPTIONAL_PROJECT,
      include_neighbors: Type.Optional(Type.Boolean()),
      ...EXPLORATION_OUTPUT_CONTROL_PARAMS,
      timeout_ms: TIMEOUT_MS,
    }),
    execute: (params, services, ctx) => services.query.executeQueryTool("Code snippet", "get_code_snippet", params, ctx),
    renderCall: renderCall("get_code_snippet", (args) => String(args.qualified_name ?? "")),
    renderResult: renderResult("get_code_snippet"),
  },
  {
    name: "get_code_snippets",
    label: "CBM Snippets",
    description: "Retrieve compact source for multiple known graph symbols by qualified_name in one batch call.",
    parameters: Type.Object({
      qualified_names: Type.Array(Type.String({ description: "qualified_name values to read." })),
      project: OPTIONAL_PROJECT,
      include_neighbors: Type.Optional(Type.Boolean()),
      max_concurrency: MAX_CONCURRENCY,
      ...EXPLORATION_OUTPUT_CONTROL_PARAMS,
      timeout_ms: TIMEOUT_MS,
    }),
    execute: (params, services, ctx) => services.symbols.getSnippets(params, ctx),
    renderCall: renderCall("get_code_snippets", (args) => `${Array.isArray(args.qualified_names) ? args.qualified_names.length : 0} symbols`),
    renderResult: renderResult("get_code_snippets"),
  },
  {
    name: "read_symbols",
    label: "CBM Read Symbols",
    description: "Resolve and read multiple concrete symbols in one batch call; each item fails closed on ambiguity.",
    parameters: Type.Object({
      symbols: Type.Array(SYMBOL_REQUEST),
      project: OPTIONAL_PROJECT,
      neighbors: Type.Optional(SYMBOL_NEIGHBORS),
      neighbor_limit: Type.Optional(Type.Number({ default: 10 })),
      max_concurrency: MAX_CONCURRENCY,
      ...EXPLORATION_OUTPUT_CONTROL_PARAMS,
      timeout_ms: TIMEOUT_MS,
    }),
    execute: (params, services, ctx) => services.symbols.readMany(params, ctx),
    renderCall: renderCall("read_symbols", (args) => `${Array.isArray(args.symbols) ? args.symbols.length : 0} symbols`),
    renderResult: renderResult("read_symbols"),
  },
  {
    name: "search_and_read_symbols",
    label: "CBM Search + Read",
    description: "Search the code graph and immediately read source for the top matching symbols in one call.",
    parameters: Type.Object({
      project: OPTIONAL_PROJECT,
      query: Type.Optional(Type.String({ description: "Natural-language or keyword BM25 graph search." })),
      label: Type.Optional(Type.String()),
      name_pattern: Type.Optional(Type.String({ description: "Regex name pattern, e.g. .*Handler.*" })),
      qn_pattern: Type.Optional(Type.String()),
      file_pattern: Type.Optional(Type.String()),
      semantic_query: Type.Optional(Type.Array(Type.String())),
      search_limit: Type.Optional(Type.Number({ default: 12 })),
      read_limit: Type.Optional(Type.Number({ default: 8 })),
      include_neighbors: Type.Optional(Type.Boolean()),
      max_concurrency: MAX_CONCURRENCY,
      ...EXPLORATION_OUTPUT_CONTROL_PARAMS,
      timeout_ms: TIMEOUT_MS,
    }),
    execute: (params, services, ctx) => services.symbols.searchAndRead(params, ctx),
    renderCall: renderCall("search_and_read_symbols", (args) => String(args.query ?? args.name_pattern ?? args.qn_pattern ?? args.file_pattern ?? "")),
    renderResult: renderResult("search_and_read_symbols"),
  },
  {
    name: "trace_path",
    label: "CBM Trace",
    description: "Trace callers, callees, data flow, or cross-service paths from a known anchor function/method.",
    parameters: Type.Object({
      function_name: Type.String(),
      project: OPTIONAL_PROJECT,
      direction: Type.Optional(DIRECTION),
      depth: Type.Optional(Type.Number({ default: 3 })),
      mode: Type.Optional(TRACE_MODE),
      parameter_name: Type.Optional(Type.String()),
      edge_types: Type.Optional(Type.Array(Type.String())),
      risk_labels: Type.Optional(Type.Boolean({ description: "Heuristic risk labels. Default false; can be noisy." })),
      include_tests: Type.Optional(Type.Boolean()),
      exclude_paths: Type.Optional(Type.Array(Type.String({ description: "Plugin-side substring filters for file paths or qualified names in trace results." }))),
      ...EXPLORATION_OUTPUT_CONTROL_PARAMS,
      timeout_ms: TIMEOUT_MS,
    }),
    execute: (params, services, ctx) => services.trace.trace(params, ctx),
    renderCall: renderCall("trace_path", (args) => `${String(args.function_name ?? "")} ${String(args.direction ?? "both")}`),
    renderResult: renderResult("trace_path"),
  },
  {
    name: "get_architecture",
    label: "CBM Architecture",
    description: "Get a compact high-level architecture overview: hotspots, routes/entry points, packages, dependencies, and layers when available.",
    parameters: Type.Object({ project: OPTIONAL_PROJECT, aspects: Type.Optional(Type.Array(Type.String())), ...EXPLORATION_OUTPUT_CONTROL_PARAMS, timeout_ms: TIMEOUT_MS }),
    execute: (params, services, ctx) => services.query.executeQueryTool("Architecture overview", "get_architecture", params, ctx),
    renderCall: renderCall("get_architecture"),
    renderResult: renderResult("get_architecture"),
  },
  {
    name: "get_graph_schema",
    label: "CBM Schema",
    description: "Inspect available graph labels, edge types, and properties.",
    parameters: Type.Object({ project: OPTIONAL_PROJECT, timeout_ms: TIMEOUT_MS }),
    execute: (params, services, ctx) => services.query.executeQueryTool("Graph schema", "get_graph_schema", params, ctx),
    renderCall: renderCall("get_graph_schema"),
    renderResult: renderResult("get_graph_schema"),
  },
  {
    name: "query_graph",
    label: "CBM Query Graph",
    description: "Run read-only Cypher-like graph queries for custom structural questions, aggregations, and multi-hop relationships.",
    parameters: Type.Object({ query: Type.String(), project: OPTIONAL_PROJECT, max_rows: Type.Optional(Type.Number({ default: 200 })), ...OUTPUT_CONTROL_PARAMS, timeout_ms: TIMEOUT_MS }),
    execute: (params, services, ctx) => services.query.queryGraph(params, ctx),
    renderCall: renderCall("query_graph", (args) => String(args.query ?? "").slice(0, 80)),
    renderResult: renderResult("query_graph"),
  },
  {
    name: "search_code",
    label: "CBM Search Code",
    description: "Literal text/regex search over indexed files, enriched with symbol-grouped context.",
    parameters: Type.Object({
      pattern: Type.String(),
      project: OPTIONAL_PROJECT,
      file_pattern: Type.Optional(Type.String()),
      path_filter: Type.Optional(Type.String()),
      mode: Type.Optional(SEARCH_CODE_MODE),
      context: Type.Optional(Type.Number()),
      regex: Type.Optional(Type.Boolean()),
      limit: Type.Optional(Type.Number({ default: 10 })),
      offset: Type.Optional(Type.Number({ description: "Skip this many grouped results (sent to cbm as `result_offset`); use the pagination_hint offset to fetch the next page." })),
      ...EXPLORATION_OUTPUT_CONTROL_PARAMS,
      timeout_ms: TIMEOUT_MS,
    }),
    execute: (params, services, ctx) => services.query.executeQueryTool("Code search results", "search_code", { mode: "compact", context: 2, limit: 10, ...params }, ctx),
    renderCall: renderCall("search_code", (args) => String(args.pattern ?? "")),
    renderResult: renderResult("search_code"),
  },
  {
    name: "detect_changes",
    label: "CBM Detect Changes",
    description: "Analyze local git changes and map them to affected symbols/callers.",
    parameters: Type.Object({
      project: OPTIONAL_PROJECT,
      scope: Type.Optional(Type.String()),
      depth: Type.Optional(Type.Number({ default: 2 })),
      base_branch: Type.Optional(Type.String()),
      since: Type.Optional(Type.String()),
      ...EXPLORATION_OUTPUT_CONTROL_PARAMS,
      timeout_ms: TIMEOUT_MS,
    }),
    execute: (params, services, ctx) => services.query.executeQueryTool("Change impact results", "detect_changes", params, ctx),
    renderCall: renderCall("detect_changes"),
    renderResult: renderResult("detect_changes"),
  },
];
