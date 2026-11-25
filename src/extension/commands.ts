import type { ExtensionAPI, ExtensionUIContext } from "@oh-my-pi/pi-coding-agent";
import type { CbmServices } from "../cbm-tools/definitions.js";

type CommandUi = Pick<ExtensionUIContext, "select" | "notify">;

export function registerCommands(api: ExtensionAPI, services: CbmServices) {
  api.registerCommand("cbm", {
    description: "Open the CBM settings menu. Usage: /cbm [menu|status|enable-non-git|disable-non-git]",
    handler: async (args, ctx) => {
      const action = args.trim() || "menu";

      if (action === "menu") {
        await openSettingsMenu(services, ctx.ui);
        return;
      }

      if (action === "status") {
        ctx.ui.notify(buildStatus(services), "info");
        return;
      }

      if (action === "enable-non-git") {
        services.settings.setAutoIndexNonGitDirectories(true);
        ctx.ui.notify("CBM: auto-indexing safe non-git directories is enabled. Root, home, and system paths are still blocked.", "info");
        return;
      }

      if (action === "disable-non-git") {
        services.settings.setAutoIndexNonGitDirectories(false);
        ctx.ui.notify("CBM: auto-indexing non-git directories is disabled. Git repositories will still be indexed.", "info");
        return;
      }

      ctx.ui.notify(`Unknown /cbm action: ${action}. Use menu, status, enable-non-git, or disable-non-git.`, "warning");
    },
  });
}

async function openSettingsMenu(services: CbmServices, ui: CommandUi) {
  while (true) {
    const choice = await ui.select("CBM settings", [
      `auto-index non-git directories: ${services.settings.autoIndexNonGitDirectories ? "enabled" : "disabled"} - toggle`,
      "show status",
      "done",
    ]);

    if (!choice || choice === "done") return;

    if (choice.startsWith("auto-index non-git directories:")) {
      const enabled = !services.settings.autoIndexNonGitDirectories;
      services.settings.setAutoIndexNonGitDirectories(enabled);
      ui.notify(
        enabled
          ? "CBM: auto-indexing safe non-git directories is enabled. Root, home, and system paths are still blocked."
          : "CBM: auto-indexing non-git directories is disabled. Git repositories will still be indexed.",
        "info",
      );
      continue;
    }

    if (choice === "show status") {
      ui.notify(buildStatus(services), "info");
    }
  }
}

function buildStatus(services: CbmServices): string {
  return [
    "CBM status",
    "  auto-index:",
    "    git repositories: enabled",
    `    non-git directories: ${services.settings.autoIndexNonGitDirectories ? "enabled" : "disabled"}`,
    "    unsafe path guard: enabled",
  ].join("\n");
}
