import React, { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { BookOpen, Pencil, Radio, Zap, ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import "./PluginPanel.css";

interface Plugin {
  name: string;
  version: string;
  description: string;
  author: string;
  state: string;
  permissions: string[];
  exec_count: number;
}

interface AppliedConstant {
  name: string;
  value: number;
}

interface WasmPluginExecutionResult {
  exec_count: number;
  result_code: number | null;
  applied_constants: AppliedConstant[];
  unapplied_actions: string[];
}

interface PluginPanelProps {
  isConnected: boolean;
}

const ALL_PERMISSIONS = ["ReadTables", "WriteConstants", "SubscribeChannels", "ExecuteActions"];

export const PluginPanel: React.FC<PluginPanelProps> = ({ isConnected }) => {
  const { showToast } = useToast();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [pendingPlugin, setPendingPlugin] = useState<{ path: string; name: string } | null>(null);
  const [consentedPermissions, setConsentedPermissions] = useState<Set<string>>(new Set());
  const [lastResult, setLastResult] = useState<WasmPluginExecutionResult | null>(null);

  // Load list of plugins
  const loadPlugins = useCallback(async () => {
    try {
      setLoading(true);
      const list: Plugin[] = await invoke("list_wasm_plugins");
      setPlugins(list);
    } catch (error) {
      console.error("Failed to load plugins:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  // Pick a plugin file, then open the permission-consent dialog instead of
  // loading immediately — permissions must be explicitly approved here, not
  // auto-granted from a self-declared manifest.
  const handleLoadPlugin = useCallback(async () => {
    try {
      const files = await open({
        filters: [
          { name: "WASM Plugins", extensions: ["wasm"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (files && !Array.isArray(files)) {
        const filename = (files as string).split("/").pop()?.split("\\").pop()?.replace(".wasm", "") || "unknown";
        setConsentedPermissions(new Set());
        setPendingPlugin({ path: files as string, name: filename });
      }
    } catch (error) {
      console.error("Failed to load plugin:", error);
      showToast(`Failed to open plugin file: ${error}`, "error");
    }
  }, [showToast]);

  const togglePendingPermission = useCallback((perm: string) => {
    setConsentedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) {
        next.delete(perm);
      } else {
        next.add(perm);
      }
      return next;
    });
  }, []);

  const cancelPendingPlugin = useCallback(() => {
    setPendingPlugin(null);
    setConsentedPermissions(new Set());
  }, []);

  // User has reviewed the requested permissions and approved a subset (or
  // all, or none) of them — only the checked ones are ever granted, on the
  // Rust side, regardless of what the manifest claims to want.
  const confirmPendingPlugin = useCallback(async () => {
    if (!pendingPlugin) return;
    try {
      const approved = Array.from(consentedPermissions);
      const manifest = JSON.stringify({
        name: pendingPlugin.name,
        version: "1.0.0",
        description: `Plugin loaded from ${pendingPlugin.name}.wasm`,
        author: "Unknown",
        permissions: approved,
      });
      await invoke("load_wasm_plugin", {
        path: pendingPlugin.path,
        manifestJson: manifest,
        approvedPermissions: approved,
      });
      showToast(`Loaded plugin "${pendingPlugin.name}"`, "success");
      await loadPlugins();
    } catch (error) {
      console.error("Failed to load plugin:", error);
      showToast(`Failed to load plugin: ${error}`, "error");
    } finally {
      setPendingPlugin(null);
      setConsentedPermissions(new Set());
    }
  }, [pendingPlugin, consentedPermissions, loadPlugins, showToast]);

  // Unload plugin
  const handleUnloadPlugin = useCallback(
    async (name: string) => {
      try {
        await invoke("unload_wasm_plugin", { name });
        await loadPlugins();
        setSelectedPlugin(null);
      } catch (error) {
        console.error("Failed to unload plugin:", error);
        showToast(`Failed to unload plugin: ${error}`, "error");
      }
    },
    [loadPlugins, showToast]
  );

  // Execute plugin
  const handleExecutePlugin = useCallback(async (name: string) => {
    try {
      const result: WasmPluginExecutionResult = await invoke("execute_wasm_plugin", { name });
      setLastResult(result);
      await loadPlugins();
    } catch (error) {
      console.error("Failed to execute plugin:", error);
      showToast(`Failed to execute plugin: ${error}`, "error");
      setLastResult(null);
    }
  }, [loadPlugins, showToast]);

  // Get permission display
  const getPermissionDisplay = (perm: string): { label: string; Icon: LucideIcon | null } => {
    const permMap: Record<string, { label: string; Icon: LucideIcon }> = {
      ReadTables: { label: "Чтение таблиц", Icon: BookOpen },
      WriteConstants: { label: "Записать константы", Icon: Pencil },
      SubscribeChannels: { label: "Подписка на каналы", Icon: Radio },
      ExecuteActions: { label: "Выполнить действия", Icon: Zap },
    };
    return permMap[perm] || { label: perm, Icon: null };
  };

  // Get state color
  const getStateColor = (state: string) => {
    const s = state.toLowerCase();
    switch (s) {
      case "ready":
        return "#4ade80"; // Green
      case "running":
        return "#60a5fa"; // Blue
      case "loaded":
        return "#fbbf24"; // Amber
      case "disabled":
      case "unloading":
        return "#ef4444"; // Red
      default:
        return "#6b7280"; // Gray
    }
  };

  const selected = plugins.find((p) => p.name === selectedPlugin);

  return (
    <div className="plugin-panel">
      <div className="plugin-header">
        <h2>Менеджер плагинов</h2>
        <button
          className="plugin-button plugin-button-primary"
          onClick={handleLoadPlugin}
          disabled={!isConnected}
          title={isConnected ? "Загрузить плагин" : "Сначала подключитесь к ЭБУ"}
        >
          + Загрузить плагин
        </button>
        <button
          className="plugin-button plugin-button-secondary"
          onClick={loadPlugins}
          disabled={loading}
        >
          {loading ? "Loading..." : "Обновить"}
        </button>
      </div>

      <div className="plugin-content">
        <div className="plugin-list">
          <div className="plugin-list-header">
            <h3>Загруженные плагины ({plugins.length})</h3>
          </div>

          {plugins.length === 0 ? (
            <div className="plugin-empty">
              <p>Плагины не загружены</p>
              <small>Нажмите «Загрузить плагин», чтобы добавить плагины WASM</small>
            </div>
          ) : (
            <div className="plugin-grid">
              {plugins.map((plugin) => (
                <div
                  key={plugin.name}
                  className={`plugin-card ${selectedPlugin === plugin.name ? "selected" : ""}`}
                  onClick={() => setSelectedPlugin(plugin.name)}
                >
                  <div className="plugin-card-header">
                    <div>
                      <h4>{plugin.name}</h4>
                      <small>v{plugin.version}</small>
                    </div>
                    <span
                      className="plugin-state-dot"
                      style={{
                        backgroundColor: getStateColor(plugin.state),
                      }}
                      title={`State: ${plugin.state}`}
                    />
                  </div>
                  <p className="plugin-description">{plugin.description}</p>
                  <div className="plugin-card-footer">
                    <span className="plugin-executions">
                      {plugin.exec_count} executions
                    </span>
                    <span className="plugin-perms">
                      {plugin.permissions.length} permissions
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="plugin-details">
            <h3>{selected.name}</h3>

            <div className="plugin-info-section">
              <label>Версия</label>
              <span className="plugin-value">{selected.version}</span>
            </div>

            <div className="plugin-info-section">
              <label>Состояние</label>
              <div className="plugin-state-badge">
                <span
                  style={{
                    backgroundColor: getStateColor(selected.state),
                  }}
                />
                <span>{selected.state.toUpperCase()}</span>
              </div>
            </div>

            <div className="plugin-info-section">
              <label>Описание</label>
              <p>{selected.description}</p>
            </div>

            <div className="plugin-info-section">
              <label>
                Разрешения ({selected.permissions.length}){" "}
                <button
                  className="plugin-expand-btn"
                  onClick={() => setShowPermissions(!showPermissions)}
                  aria-label={showPermissions ? "Свернуть разрешения" : "Развернуть разрешения"}
                >
                  {showPermissions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              </label>
              {showPermissions && (
                <div className="plugin-permissions-list">
                  {selected.permissions.length > 0 ? (
                    selected.permissions.map((perm) => {
                      const { label, Icon } = getPermissionDisplay(perm);
                      return (
                        <div key={perm} className="plugin-permission-item" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {Icon && <Icon size={14} aria-hidden />}
                          <span>{label}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="plugin-no-perms">Разрешения не требуются</p>
                  )}
                </div>
              )}
            </div>

            <div className="plugin-info-section">
              <label>Выполнения</label>
              <span className="plugin-value">{selected.exec_count}</span>
            </div>

            {lastResult && (
              <div className="plugin-info-section">
                <label>Результат последнего запуска</label>
                <div className="plugin-permissions-list">
                  {lastResult.applied_constants.length === 0 &&
                  lastResult.unapplied_actions.length === 0 ? (
                    <p className="plugin-no-perms">Изменений не предложено</p>
                  ) : (
                    <>
                      {lastResult.applied_constants.map((c) => (
                        <div key={c.name} className="plugin-permission-item">
                          Задать {c.name} = {c.value}
                        </div>
                      ))}
                      {lastResult.unapplied_actions.length > 0 && (
                        <p className="plugin-no-perms">
                          {lastResult.unapplied_actions.length} действие(й) предложено, но ещё не применено — выполнение сценариев действий пока не подключено.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="plugin-actions">
              <button
                className="plugin-button plugin-button-action"
                onClick={() => handleExecutePlugin(selected.name)}
                disabled={selected.state === "disabled"}
              >
                Выполнить
              </button>
              <button
                className="plugin-button plugin-button-danger"
                onClick={() => handleUnloadPlugin(selected.name)}
              >
                Выгрузить
              </button>
            </div>
          </div>
        )}
      </div>

      {pendingPlugin && (
        <div className="plugin-consent-overlay" role="dialog" aria-modal="true">
          <div className="plugin-consent-dialog">
            <h3>Предоставить разрешения для «{pendingPlugin.name}"?</h3>
            <p className="plugin-consent-warning">
              Этот плагин выполняет код WebAssembly в песочнице. Отметьте только те возможности, которые хотите разрешить — всё неотмеченное будет запрещено независимо от запросов плагина.
            </p>
            <div className="plugin-consent-list">
              {ALL_PERMISSIONS.map((perm) => {
                const { label, Icon } = getPermissionDisplay(perm);
                return (
                  <label key={perm} className="plugin-consent-item">
                    <input
                      type="checkbox"
                      checked={consentedPermissions.has(perm)}
                      onChange={() => togglePendingPermission(perm)}
                    />
                    {Icon && <Icon size={14} aria-hidden />}
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
            <div className="plugin-actions">
              <button className="plugin-button plugin-button-secondary" onClick={cancelPendingPlugin}>
                Отмена
              </button>
              <button className="plugin-button plugin-button-primary" onClick={confirmPendingPlugin}>
                Загрузить плагин
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginPanel;
