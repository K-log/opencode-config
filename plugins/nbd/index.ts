import type { PluginModule } from "@opencode-ai/plugin"
import { loadConfig } from "./config"
import { sessionLoggerHooks } from "./modules/session-logger"
import { costTrackerHooks } from "./modules/cost-tracker"
import { autoStageHooks } from "./modules/auto-stage"
import { sessionStatsHooks } from "./modules/session-stats"
import { autoFormatHooks } from "./modules/auto-format"
import { branchGuardHooks } from "./modules/branch-guard"
import { commitGuardHooks } from "./modules/commit-guard"
import { undoStackHooks } from "./modules/undo-stack"
import { preCommitHookHooks } from "./modules/pre-commit-hook"
import { secretScannerHooks } from "./modules/secret-scanner"
import { testOnSaveHooks } from "./modules/test-on-save"
import { lintOnSaveHooks } from "./modules/lint-on-save"
import { memorySyncHooks } from "./modules/memory-sync"
import { contextInjectorHooks } from "./modules/context-injector"
import { auditLoggerHooks } from "./modules/audit-logger"
import { costCapHooks } from "./modules/cost-cap"
import { telemetryHooks } from "./modules/telemetry"
import { recentFilesTrackerHooks } from "./modules/recent-files-tracker"
import { slackNotifierHooks } from "./modules/slack-notifier"
import { jiraLinkHooks } from "./modules/jira-link"
import { githubPrHooks } from "./modules/github-pr"
import { figmaFetchHooks } from "./modules/figma-fetch"
import { progressBarHooks } from "./modules/progress-bar"
import { diffPreviewHooks } from "./modules/diff-preview"
import { compactModeHooks } from "./modules/compact-mode"
import nbdMemoryRead from "./tools/nbd_memory_read"
import nbdMemoryWrite from "./tools/nbd_memory_write"
import nbdLogDecision from "./tools/nbd_log_decision"
import nbdRecentFiles from "./tools/nbd_recent_files"
import nbdSessionSummary from "./tools/nbd_session_summary"
import nbdCostReport from "./tools/nbd_cost_report"
import nbdUndoLast from "./tools/nbd_undo_last"
import nbdAuditLog from "./tools/nbd_audit_log"
import nbdNotify from "./tools/nbd_notify"
import nbdConfigGet from "./tools/nbd_config_get"
import nbdConfigSet from "./tools/nbd_config_set"
import nbdModuleStatus from "./tools/nbd_module_status"
import nbdSlackNotify from "./tools/nbd_slack_notify"
import nbdJiraLink from "./tools/nbd_jira_link"
import nbdFigmaFetch from "./tools/nbd_figma_fetch"

export default {
  id: "nbd",
  async server(ctx, _options) {
    await loadConfig()

    const sessionHooks = sessionLoggerHooks(ctx.client)
    const costHooks = costTrackerHooks(ctx.client)
    const autoStage = autoStageHooks()
    const sessionStats = sessionStatsHooks(ctx.client)
    const autoFormat = autoFormatHooks(ctx.client)
    const branchGuard = branchGuardHooks(ctx.client)
    const commitGuard = commitGuardHooks()
    const undoStack = undoStackHooks(ctx.client)
    const preCommitHook = preCommitHookHooks()
    const secretScanner = secretScannerHooks(ctx.client)
    const testOnSave = testOnSaveHooks(ctx.client)
    const lintOnSave = lintOnSaveHooks(ctx.client)
    const memorySync = memorySyncHooks(ctx.client)
    const contextInjector = contextInjectorHooks()
    const auditLogger = auditLoggerHooks(ctx.client)
    const costCap = costCapHooks(ctx.client)
    const telemetry = telemetryHooks(ctx.client)
    const recentFilesTracker = recentFilesTrackerHooks(ctx.client)
    const slackNotifier = slackNotifierHooks()
    const jiraLink = jiraLinkHooks()
    const githubPr = githubPrHooks()
    const figmaFetch = figmaFetchHooks()
    const progressBar = progressBarHooks()
    const diffPreview = diffPreviewHooks()
    const compactMode = compactModeHooks()

    return {
      tool: {
        nbd_memory_read: nbdMemoryRead,
        nbd_memory_write: nbdMemoryWrite,
        nbd_log_decision: nbdLogDecision,
        nbd_recent_files: nbdRecentFiles,
        nbd_session_summary: nbdSessionSummary,
        nbd_cost_report: nbdCostReport,
        nbd_undo_last: nbdUndoLast,
        nbd_audit_log: nbdAuditLog,
        nbd_notify: nbdNotify,
        nbd_config_get: nbdConfigGet,
        nbd_config_set: nbdConfigSet,
        nbd_module_status: nbdModuleStatus,
        nbd_slack_notify: nbdSlackNotify,
        nbd_jira_link: nbdJiraLink,
        nbd_figma_fetch: nbdFigmaFetch,
      },

      async event(input) {
        await sessionHooks.event?.(input)
        await costHooks.event?.(input)
        await autoStage.event?.(input)
        await sessionStats.event?.(input)
        await autoFormat.event?.(input)
        await branchGuard.event?.(input)
        await commitGuard.event?.(input)
        await undoStack.event?.(input)
        await preCommitHook.event?.(input)
        await secretScanner.event?.(input)
        await testOnSave.event?.(input)
        await lintOnSave.event?.(input)
        await memorySync.event?.(input)
        await contextInjector.event?.(input)
        await auditLogger.event?.(input)
        await costCap.event?.(input)
        await telemetry.event?.(input)
        await recentFilesTracker.event?.(input)
        await slackNotifier.event?.(input)
        await jiraLink.event?.(input)
        await githubPr.event?.(input)
        await figmaFetch.event?.(input)
        await progressBar.event?.(input)
        await diffPreview.event?.(input)
        await compactMode.event?.(input)
      },
    }
  },
} satisfies PluginModule
