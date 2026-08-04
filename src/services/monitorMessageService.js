function escapeHtml(value) {
    return String(value ?? "Unknown")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
  
  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "Unknown";
    }
  
    const totalMinutes = Math.floor(seconds / 60);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
  
    return [
      days > 0 ? `${days}d` : null,
      hours > 0 ? `${hours}h` : null,
      `${minutes}m`,
    ]
      .filter(Boolean)
      .join(" ");
  }
  
  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) {
      return "Unknown";
    }
  
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = bytes;
    let unitIndex = 0;
  
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
  
    const digits = unitIndex >= 3 ? 1 : 0;
    return `${value.toFixed(digits)} ${units[unitIndex]}`;
  }
  
  function formatTimestamp(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
  
    if (Number.isNaN(date.getTime())) {
      return "Unknown time";
    }
  
    const formatted = new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date);
  
    return `${formatted} PHT`;
  }
  
  function formatShortTimestamp(value) {
    if (!value) {
      return "Not available";
    }
  
    return formatTimestamp(value);
  }
  
  function formatStatus(value) {
    return escapeHtml(String(value ?? "UNKNOWN").toUpperCase());
  }
  
  function getRuntime(snapshot) {
    return snapshot.runtime?.data ?? {};
  }
  
  function getSolaceProcess(snapshot) {
    return snapshot.pm2?.solace ?? null;
  }
  
  function getMonitorProcess(snapshot) {
    return snapshot.pm2?.monitor ?? null;
  }
  
  function isGatewayHealthy(snapshot) {
    const runtime = getRuntime(snapshot);
  
    return snapshot.runtime?.fresh === true &&
      runtime.discord?.ready === true;
  }
  
  function getOverallState(snapshot) {
    const solaceOnline =
      getSolaceProcess(snapshot)?.status === "online";
  
    const monitorOnline =
      getMonitorProcess(snapshot)?.status === "online";
  
    const gatewayHealthy = isGatewayHealthy(snapshot);
    const restHealthy = snapshot.discord?.rest?.reachable === true;
    const officialIndicator =
      snapshot.discord?.official?.indicator ?? "unknown";
  
    const settingsHealthy =
      snapshot.scheduler?.settingsValid === true;
  
    const schedulerFresh = (() => {
      const lastCheck = getRuntime(snapshot).scheduler?.lastCheckAt;
  
      if (!lastCheck) {
        return false;
      }
  
      const age = (Date.now() - new Date(lastCheck).getTime()) / 1000;
      return Number.isFinite(age) && age <= 120;
    })();
  
    const critical = !solaceOnline || !monitorOnline ||
      !gatewayHealthy || !settingsHealthy;
  
    const warning = !restHealthy || !schedulerFresh ||
      officialIndicator !== "none";
  
    if (critical) {
      return {
        icon: "🔴",
        label: "Attention required",
        level: "critical",
      };
    }
  
    if (warning) {
      return {
        icon: "🟠",
        label: "Degraded",
        level: "warning",
      };
    }
  
    return {
      icon: "🟢",
      label: "All systems operational",
      level: "healthy",
    };
  }
  
  function serviceLine(icon, label, value) {
    return `${icon} <b>${escapeHtml(label)}</b>  <code>${formatStatus(value)}</code>`;
  }
  
  function metricLine(icon, label, value) {
    return `${icon} ${escapeHtml(label)}  <code>${escapeHtml(value)}</code>`;
  }
  
  function createFullStatus(snapshot) {
    const overall = getOverallState(snapshot);
    const solace = getSolaceProcess(snapshot);
    const monitor = getMonitorProcess(snapshot);
    const runtime = getRuntime(snapshot);
    const battery = snapshot.battery ?? {};
    const storage = snapshot.storage ?? {};
    const scheduler = snapshot.scheduler ?? {};
    const official = snapshot.discord?.official ?? {};
  
    const gatewayPing = runtime.discord?.gatewayPing;
    const discordIncident = official.activeIncidents?.at(0)?.name;
  
    return [
      "🌿 <b>Solace Monitor</b>",
      "<i>Private infrastructure overview</i>",
      "",
      "━━━━━━━━━━━━━━━━━━",
      "",
      "<b>Overall Status</b>",
      `${overall.icon} <b>${escapeHtml(overall.label)}</b>`,
      "",
      "<b>Service Health</b>",
      serviceLine(
        solace?.status === "online" ? "🟢" : "🔴",
        "Solace",
        solace?.status ?? "missing",
      ),
      serviceLine(
        monitor?.status === "online" ? "🟢" : "🔴",
        "Monitor",
        monitor?.status ?? "missing",
      ),
      serviceLine(
        isGatewayHealthy(snapshot) ? "🟢" : "🔴",
        "Discord Gateway",
        isGatewayHealthy(snapshot) ? "connected" : "unhealthy",
      ),
      serviceLine(
        snapshot.discord?.rest?.reachable ? "🟢" : "🔴",
        "Discord REST API",
        snapshot.discord?.rest?.reachable ? "reachable" : "unreachable",
      ),
      serviceLine(
        scheduler.settingsValid ? "🟢" : "🔴",
        "Settings Data",
        scheduler.settingsValid ? "valid" : "invalid",
      ),
      "",
      "<b>Network</b>",
      metricLine(
        "📡",
        "Gateway ping",
        Number.isFinite(gatewayPing) ? `${gatewayPing} ms` : "Unavailable",
      ),
      metricLine(
        "⚡",
        "Discord API",
        Number.isFinite(snapshot.discord?.rest?.latencyMs)
          ? `${snapshot.discord.rest.latencyMs} ms`
          : "Unavailable",
      ),
      metricLine(
        official.indicator === "none" ? "🟢" : "🟠",
        "Official status",
        official.description ?? "Unavailable",
      ),
      ...(discordIncident
        ? [metricLine("⚠️", "Active incident", discordIncident)]
        : []),
      "",
      "<b>Runtime</b>",
      metricLine("📱", "Phone uptime", formatDuration(snapshot.device?.phoneUptimeSeconds)),
      metricLine("🌿", "Solace uptime", formatDuration(solace?.uptimeSeconds)),
      metricLine("👁", "Monitor uptime", formatDuration(monitor?.uptimeSeconds)),
      "",
      "<b>Process Health</b>",
      metricLine("🔄", "Solace restarts", String(solace?.restartCount ?? "Unknown")),
      metricLine("🔄", "Monitor restarts", String(monitor?.restartCount ?? "Unknown")),
      metricLine("🧠", "Solace memory", formatBytes(solace?.memoryBytes)),
      metricLine("🧠", "Monitor memory", formatBytes(monitor?.memoryBytes)),
      "",
      "<b>Host Device</b>",
      metricLine(
        "🔋",
        "Battery",
        battery.available
          ? `${battery.percentage}% • ${battery.status}`
          : "Unavailable",
      ),
      metricLine(
        "🔌",
        "Power",
        battery.available ? battery.plugged : "Unavailable",
      ),
      metricLine(
        "🌡",
        "Battery temperature",
        Number.isFinite(battery.temperatureCelsius)
          ? `${battery.temperatureCelsius.toFixed(1)}°C`
          : "Unavailable",
      ),
      metricLine(
        "🧠",
        "Phone RAM",
        Number.isFinite(snapshot.device?.memoryUsedPercent)
          ? `${snapshot.device.memoryUsedPercent}% used`
          : "Unavailable",
      ),
      metricLine(
        "💽",
        "Storage",
        storage.available
          ? `${formatBytes(storage.freeBytes)} free`
          : "Unavailable",
      ),
      "",
      "<b>Daily Scheduler</b>",
      metricLine("🏠", "Configured servers", String(scheduler.configuredGuilds ?? 0)),
      metricLine("🟢", "Enabled servers", String(scheduler.enabledGuilds ?? 0)),
      metricLine("🕕", "Posting time", scheduler.postingTime ?? "Not configured"),
      metricLine("🌏", "Timezone", scheduler.timezone ?? "Not configured"),
      metricLine("✅", "Last automatic post", formatShortTimestamp(scheduler.lastAutomaticPostAt)),
      "",
      "<b>Application</b>",
      metricLine("📦", "Solace", `v${snapshot.application?.version ?? "unknown"}`),
      metricLine("🟩", "Node.js", snapshot.application?.nodeVersion ?? "unknown"),
      metricLine("⚙️", "PM2", snapshot.git?.pm2Version ?? "unknown"),
      metricLine("🌿", "Git commit", snapshot.git?.commit ?? "unknown"),
      metricLine("🌱", "Branch", snapshot.git?.branch ?? "unknown"),
      metricLine(
        snapshot.git?.clean ? "🟢" : "🟠",
        "Working tree",
        snapshot.git?.clean === true
          ? "clean"
          : snapshot.git?.clean === false
            ? "modified"
            : "unknown",
      ),
      "",
      "━━━━━━━━━━━━━━━━━━",
      `<i>${escapeHtml(formatTimestamp(snapshot.collectedAt))}</i>`,
    ].join("\n");
  }
  
  function createDeviceReport(snapshot) {
    const battery = snapshot.battery ?? {};
    const storage = snapshot.storage ?? {};
    const device = snapshot.device ?? {};
  
    return [
      "📱 <b>Host Device</b>",
      "<i>Real-time phone health</i>",
      "",
      "━━━━━━━━━━━━━━━━━━",
      "",
      metricLine("📱", "Device", `${device.manufacturer ?? "Unknown"} ${device.model ?? ""}`.trim()),
      metricLine("🤖", "Android", device.androidVersion ?? "Unknown"),
      metricLine("⏱", "Phone uptime", formatDuration(device.phoneUptimeSeconds)),
      "",
      "<b>Power</b>",
      metricLine("🔋", "Battery", battery.available ? `${battery.percentage}%` : "Unavailable"),
      metricLine("🔌", "Connection", battery.available ? battery.plugged : "Unavailable"),
      metricLine("💚", "Health", battery.available ? battery.health : "Unavailable"),
      metricLine("⚡", "State", battery.available ? battery.status : "Unavailable"),
      metricLine(
        "🌡",
        "Temperature",
        Number.isFinite(battery.temperatureCelsius)
          ? `${battery.temperatureCelsius.toFixed(1)}°C`
          : "Unavailable",
      ),
      "",
      "<b>Resources</b>",
      metricLine("🧠", "RAM used", `${device.memoryUsedPercent ?? "Unknown"}%`),
      metricLine("🧠", "RAM free", formatBytes(device.freeMemoryBytes)),
      metricLine("💽", "Storage used", storage.available ? `${storage.usedPercent}%` : "Unavailable"),
      metricLine("💽", "Storage free", storage.available ? formatBytes(storage.freeBytes) : "Unavailable"),
      "",
      "━━━━━━━━━━━━━━━━━━",
      `<i>${escapeHtml(formatTimestamp(snapshot.collectedAt))}</i>`,
    ].join("\n");
  }
  
  function createSchedulerReport(snapshot) {
    const scheduler = snapshot.scheduler ?? {};
    const runtimeScheduler = getRuntime(snapshot).scheduler ?? {};
  
    return [
      "🕕 <b>Daily Scheduler</b>",
      "<i>Automatic wellness-post health</i>",
      "",
      "━━━━━━━━━━━━━━━━━━",
      "",
      serviceLine(
        scheduler.settingsValid ? "🟢" : "🔴",
        "Settings file",
        scheduler.settingsValid ? "valid" : "invalid",
      ),
      serviceLine(
        scheduler.backupExists && scheduler.backupValid ? "🟢" : "🟠",
        "Automatic backup",
        scheduler.backupExists && scheduler.backupValid ? "available" : "unavailable",
      ),
      metricLine("🏠", "Configured servers", String(scheduler.configuredGuilds ?? 0)),
      metricLine("🟢", "Enabled servers", String(scheduler.enabledGuilds ?? 0)),
      metricLine("🕕", "Posting time", scheduler.postingTime ?? "Not configured"),
      metricLine("🌏", "Timezone", scheduler.timezone ?? "Not configured"),
      metricLine("🔍", "Last scheduler check", formatShortTimestamp(runtimeScheduler.lastCheckAt)),
      metricLine("✅", "Last successful post", formatShortTimestamp(scheduler.lastAutomaticPostAt)),
      metricLine("❌", "Last failed post", formatShortTimestamp(runtimeScheduler.lastFailedPostAt)),
      metricLine(
        "💾",
        "Backup age",
        Number.isFinite(scheduler.backupAgeSeconds)
          ? formatDuration(scheduler.backupAgeSeconds)
          : "Unavailable",
      ),
      "",
      "━━━━━━━━━━━━━━━━━━",
      `<i>${escapeHtml(formatTimestamp(snapshot.collectedAt))}</i>`,
    ].join("\n");
  }
  
  function createProcessReport(snapshot) {
    const solace = getSolaceProcess(snapshot);
    const monitor = getMonitorProcess(snapshot);
    const runtime = getRuntime(snapshot);
  
    return [
      "⚙️ <b>Process Health</b>",
      "<i>PM2 and Discord runtime details</i>",
      "",
      "━━━━━━━━━━━━━━━━━━",
      "",
      "<b>Solace</b>",
      serviceLine(solace?.status === "online" ? "🟢" : "🔴", "Status", solace?.status ?? "missing"),
      metricLine("⏱", "Uptime", formatDuration(solace?.uptimeSeconds)),
      metricLine("🔄", "Restarts", String(solace?.restartCount ?? "Unknown")),
      metricLine("🧠", "Memory", formatBytes(solace?.memoryBytes)),
      metricLine("⚙️", "CPU", `${solace?.cpuPercent ?? "Unknown"}%`),
      metricLine("🧾", "PID", String(solace?.pid ?? "Unknown")),
      "",
      "<b>Monitor</b>",
      serviceLine(monitor?.status === "online" ? "🟢" : "🔴", "Status", monitor?.status ?? "missing"),
      metricLine("⏱", "Uptime", formatDuration(monitor?.uptimeSeconds)),
      metricLine("🔄", "Restarts", String(monitor?.restartCount ?? "Unknown")),
      metricLine("🧠", "Memory", formatBytes(monitor?.memoryBytes)),
      metricLine("⚙️", "CPU", `${monitor?.cpuPercent ?? "Unknown"}%`),
      "",
      "<b>Discord Runtime</b>",
      serviceLine(isGatewayHealthy(snapshot) ? "🟢" : "🔴", "Gateway", isGatewayHealthy(snapshot) ? "connected" : "unhealthy"),
      metricLine("📡", "Gateway ping", Number.isFinite(runtime.discord?.gatewayPing) ? `${runtime.discord.gatewayPing} ms` : "Unavailable"),
      metricLine("🔔", "Last Gateway event", runtime.discord?.lastGatewayEvent ?? "Unavailable"),
      metricLine("💬", "Interactions received", String(runtime.interactions?.receivedSinceStart ?? 0)),
      metricLine("🕒", "Last interaction", formatShortTimestamp(runtime.interactions?.lastReceivedAt)),
      "",
      "━━━━━━━━━━━━━━━━━━",
      `<i>${escapeHtml(formatTimestamp(snapshot.collectedAt))}</i>`,
    ].join("\n");
  }
  
  function createHeartbeat(snapshot) {
    const overall = getOverallState(snapshot);
    const solace = getSolaceProcess(snapshot);
    const battery = snapshot.battery ?? {};
  
    return [
      "💙 <b>Solace Heartbeat</b>",
      "<i>Scheduled system health report</i>",
      "",
      "━━━━━━━━━━━━━━━━━━",
      "",
      `${overall.icon} <b>${escapeHtml(overall.label)}</b>`,
      serviceLine(solace?.status === "online" ? "🟢" : "🔴", "Solace", solace?.status ?? "missing"),
      serviceLine(isGatewayHealthy(snapshot) ? "🟢" : "🔴", "Discord", isGatewayHealthy(snapshot) ? "connected" : "unhealthy"),
      metricLine("⏱", "Solace uptime", formatDuration(solace?.uptimeSeconds)),
      metricLine("🔄", "Restarts", String(solace?.restartCount ?? "Unknown")),
      metricLine("🔋", "Battery", battery.available ? `${battery.percentage}% • ${battery.status}` : "Unavailable"),
      metricLine("🌡", "Temperature", Number.isFinite(battery.temperatureCelsius) ? `${battery.temperatureCelsius.toFixed(1)}°C` : "Unavailable"),
      metricLine("💽", "Storage free", snapshot.storage?.available ? formatBytes(snapshot.storage.freeBytes) : "Unavailable"),
      "",
      "━━━━━━━━━━━━━━━━━━",
      `<i>${escapeHtml(formatTimestamp(snapshot.collectedAt))}</i>`,
    ].join("\n");
  }
  
  function createDailySummary(snapshot, stats) {
    const availability = stats.checks > 0
      ? ((stats.healthyChecks / stats.checks) * 100).toFixed(2)
      : "0.00";
  
    return [
      "🌅 <b>Solace Daily Report</b>",
      "<i>Monitoring summary for the current reporting period</i>",
      "",
      "━━━━━━━━━━━━━━━━━━",
      "",
      "<b>Availability</b>",
      metricLine("🟢", "Healthy checks", `${stats.healthyChecks}/${stats.checks}`),
      metricLine("📈", "Observed availability", `${availability}%`),
      metricLine("🔄", "Solace restarts", String(stats.solaceRestarts ?? 0)),
      metricLine("🌐", "Discord outages", String(stats.discordOutages ?? 0)),
      "",
      "<b>Host Range</b>",
      metricLine("🔋", "Lowest battery", Number.isFinite(stats.lowestBattery) ? `${stats.lowestBattery}%` : "Unavailable"),
      metricLine("🌡", "Highest temperature", Number.isFinite(stats.highestTemperature) ? `${stats.highestTemperature.toFixed(1)}°C` : "Unavailable"),
      metricLine("💽", "Storage remaining", snapshot.storage?.available ? formatBytes(snapshot.storage.freeBytes) : "Unavailable"),
      "",
      "<b>Scheduler</b>",
      metricLine("✅", "Last automatic post", formatShortTimestamp(snapshot.scheduler?.lastAutomaticPostAt)),
      "",
      "━━━━━━━━━━━━━━━━━━",
      `<i>${escapeHtml(formatTimestamp(snapshot.collectedAt))}</i>`,
    ].join("\n");
  }
  
  function createAlert({
    level = "warning",
    title,
    summary,
    details = [],
    snapshot,
  }) {
    const styles = {
      info: ["ℹ️", "System update"],
      warning: ["⚠️", "Warning"],
      critical: ["🚨", "Critical alert"],
      recovery: ["✅", "Systems recovered"],
    };
  
    const [icon, fallbackTitle] = styles[level] ?? styles.warning;
  
    return [
      `${icon} <b>${escapeHtml(title ?? fallbackTitle)}</b>`,
      `<i>${escapeHtml(summary ?? "Monitoring state changed")}</i>`,
      "",
      "━━━━━━━━━━━━━━━━━━",
      "",
      ...details.map((detail) =>
        metricLine(detail.icon ?? "•", detail.label, detail.value),
      ),
      "",
      "━━━━━━━━━━━━━━━━━━",
      `<i>${escapeHtml(formatTimestamp(snapshot?.collectedAt ?? new Date()))}</i>`,
    ].join("\n");
  }
  
  function createHelp() {
    return [
      "🌿 <b>Solace Monitor Commands</b>",
      "<i>Private read-only controls</i>",
      "",
      "━━━━━━━━━━━━━━━━━━",
      "",
      "<code>/status</code> — Complete infrastructure overview",
      "<code>/health</code> — Same complete health report",
      "<code>/device</code> — Battery, temperature, RAM and storage",
      "<code>/scheduler</code> — Daily-post and backup health",
      "<code>/processes</code> — PM2, uptime and Gateway details",
      "<code>/help</code> — Show this command list",
      "",
      "Commands are accepted only from the configured private chat.",
      "No remote restart or destructive commands are enabled.",
    ].join("\n");
  }
  
  module.exports = {
    createFullStatus,
    createDeviceReport,
    createSchedulerReport,
    createProcessReport,
    createHeartbeat,
    createDailySummary,
    createAlert,
    createHelp,
    getOverallState,
    isGatewayHealthy,
    formatDuration,
    formatBytes,
    formatTimestamp,
  };