import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import type { TSchema } from "@oh-my-pi/pi-ai";
import { toolDefinitions, type CbmServices } from "./definitions.js";

// Extension tools default to "discoverable", which hides their schema behind a
// bash-mounted command and a one-line catalog entry. The exploration tools stay
// top-level so their schemas compete with grep/read/find; the rest remain
// discoverable to keep the per-request schema cost down.
const ESSENTIAL_TOOLS: Record<string, true> = {
  search_graph: true,
  read_symbol: true,
  read_symbols: true,
  search_and_read_symbols: true,
  search_code: true,
  trace_path: true,
};

export function registerCodebaseMemoryTools(api: ExtensionAPI, services: CbmServices) {
  for (const definition of toolDefinitions) {
    api.registerTool({
      name: definition.name,
      label: definition.label,
      description: definition.description,
      parameters: definition.parameters as TSchema,
      loadMode: ESSENTIAL_TOOLS[definition.name] === true ? "essential" : "discoverable",
      async execute(_id, params: Record<string, unknown>, signal, _onUpdate, ctx) {
        return definition.execute(params, services, { cwd: ctx.cwd, signal });
      },
      renderCall: definition.renderCall,
      renderResult: definition.renderResult,
    });
  }
}
