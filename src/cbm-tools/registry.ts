import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import type { TSchema } from "@oh-my-pi/pi-ai";
import { toolDefinitions, type CbmServices } from "./definitions.js";

export function registerCodebaseMemoryTools(api: ExtensionAPI, services: CbmServices) {
  for (const definition of toolDefinitions) {
    api.registerTool({
      name: definition.name,
      label: definition.label,
      description: definition.description,
      parameters: definition.parameters as TSchema,
      async execute(_id, params: Record<string, unknown>, signal, _onUpdate, ctx) {
        return definition.execute(params, services, { cwd: ctx.cwd, signal });
      },
      renderCall: definition.renderCall,
      renderResult: definition.renderResult,
    });
  }
}
