import { invoke } from "@tauri-apps/api/core";
import type { Tab } from "../components/tuner-ui";
import type { SimpleGaugeInfo } from "../components/curves/CurveEditor";
import type { DialogDefinition as RendererDialogDef } from "../components/dialogs/DialogRenderer";
import type { PinConfig } from "../components/hardware/PortEditor";
import {
  type BackendTableData,
  type BackendCurveData,
  type IniCapabilities,
  type TabContent,
  toTunerTableData,
  toCurveData,
} from "../types/app";

export interface OpenTargetDeps {
  tabs: Tab[];
  tabContents: Record<string, TabContent>;
  iniCapabilities: IniCapabilities | null;
  setTabs: (tabs: Tab[]) => void;
  setTabContents: (contents: Record<string, TabContent>) => void;
  setActiveTabId: (id: string) => void;
  setPortEditorAssignments: React.Dispatch<React.SetStateAction<Record<string, PinConfig[]>>>;
  showToast: (msg: string, kind?: "info" | "success" | "error" | "warning") => void;
}

export async function openTargetImpl(
  deps: OpenTargetDeps,
  name: string,
  title?: string,
  highlightTerm?: string,
): Promise<void> {
  const {
    tabs, tabContents, iniCapabilities, setTabs, setTabContents, setActiveTabId,
    setPortEditorAssignments, showToast,
  } = deps;

  console.log("[openTarget] Opening:", name, "title:", title, "highlightTerm:", highlightTerm);

  // Check if already open
  const existingTab = tabs.find((t) => t.id === name);
  if (existingTab) {
    setActiveTabId(name);
    return;
  }

  // Special built-in views
  if (name === "autotune") {
    setTabs([...tabs, { id: "autotune", title: "Автонастройка", icon: "autotune" }]);
    setTabContents({ ...tabContents, autotune: { type: "autotune", data: "" } });
    setActiveTabId("autotune");
    return;
  }

  if (name === "datalog") {
    if (!iniCapabilities?.has_datalog_entries && !iniCapabilities?.has_output_channels) {
      showToast("Запись данных недоступна для этого определения ЭБУ.", "warning");
      return;
    }
    setTabs([...tabs, { id: "datalog", title: "Запись данных", icon: "datalog" }]);
    setTabContents({ ...tabContents, datalog: { type: "datalog" } });
    setActiveTabId("datalog");
    return;
  }

  if (name === "console") {
    if (!iniCapabilities?.supports_console) {
      showToast("Консоль ЭБУ недоступна для этого определения ЭБУ.", "warning");
      return;
    }
    setTabs([...tabs, { id: "console", title: title || "Консоль ЭБУ", icon: "terminal" }]);
    setTabContents({ ...tabContents, console: { type: "console" } });
    setActiveTabId("console");
    return;
  }

  if (name === "lua-console") {
    if (!iniCapabilities?.supports_console) {
      showToast("Консоль Lua недоступна для этого определения ЭБУ.", "warning");
      return;
    }
    if (!iniCapabilities?.lua_script_constant) {
      showToast("В этом определении ЭБУ нет константы luaScript.", "warning");
      return;
    }
    setTabs([...tabs, { id: "lua-console", title: title || "Редактор Lua для ЭБУ", icon: "terminal" }]);
    setTabContents({ ...tabContents, "lua-console": { type: "lua-console" } });
    setActiveTabId("lua-console");
    return;
  }

  if (name === "tooth-logger") {
    setTabs([...tabs, { id: "tooth-logger", title: title || "Логгер зубьев", icon: "scope" }]);
    setTabContents({ ...tabContents, "tooth-logger": { type: "tooth-logger" } });
    setActiveTabId("tooth-logger");
    return;
  }

  if (name === "composite-logger") {
    setTabs([...tabs, { id: "composite-logger", title: title || "Композитный логгер", icon: "scope" }]);
    setTabContents({ ...tabContents, "composite-logger": { type: "composite-logger" } });
    setActiveTabId("composite-logger");
    return;
  }

  if (name === "datalog-viewer") {
    setTabs([...tabs, { id: "datalog-viewer", title: title || "Просмотр журнала", icon: "autotune" }]);
    setTabContents({ ...tabContents, "datalog-viewer": { type: "datalog-viewer" } });
    setActiveTabId("datalog-viewer");
    return;
  }

  if (name === "och-status") {
    setTabs([...tabs, { id: "och-status", title: title || "Состояние выходных каналов", icon: "dashboard" }]);
    setTabContents({ ...tabContents, "och-status": { type: "och-status" } });
    setActiveTabId("och-status");
    return;
  }

  // Try table first
  let tableErr: unknown = null;
  try {
    const data = await invoke<BackendTableData>("get_table_data", { tableName: name });
    const tableData = toTunerTableData(data);

    const displayTitle = title && title !== name ? `${title} (${name})` : data.title || name;
    setTabs([...tabs, { id: name, title: displayTitle, icon: "table" }]);
    setTabContents({ ...tabContents, [name]: { type: "table", data: tableData } });
    setActiveTabId(name);
    return;
  } catch (err) {
    tableErr = err;
  }

  // Try curve second
  let curveErr: unknown = null;
  try {
    const data = await invoke<BackendCurveData>("get_curve_data", { curveName: name });
    const curveData = toCurveData(data);

    let gaugeInfo: SimpleGaugeInfo | null = null;
    if (data.gauge) {
      try {
        gaugeInfo = await invoke<SimpleGaugeInfo>("get_gauge_config", { gaugeName: data.gauge });
      } catch (gaugeErr) {
        console.warn(`[openTarget] Failed to load gauge '${data.gauge}':`, gaugeErr);
      }
    }

    const displayTitle = title && title !== name ? `${title} (${name})` : data.title || name;
    setTabs([...tabs, { id: name, title: displayTitle, icon: "curve" }]);
    setTabContents({ ...tabContents, [name]: { type: "curve", data: curveData, gauge: gaugeInfo } });
    setActiveTabId(name);
    return;
  } catch (err) {
    curveErr = err;
  }

  // Try dialog third
  let dialogErr: unknown = null;
  try {
    const def = await invoke<RendererDialogDef>("get_dialog_definition", { name });

    const displayTitle = title && title !== name ? `${title} (${name})` : def.title || name;
    setTabs([...tabs, { id: name, title: displayTitle, icon: "dialog" }]);
    setTabContents({ ...tabContents, [name]: { type: "dialog", data: def, highlightTerm } });
    setActiveTabId(name);
    return;
  } catch (err) {
    dialogErr = err;
  }

  // Try portEditor fourth
  try {
    const portEditor = await invoke<{ name: string; label: string; enable_condition?: string }>(
      "get_port_editor",
      { name },
    );

    try {
      const assignments = await invoke<PinConfig[]>("get_port_editor_assignments", { name: portEditor.name });
      setPortEditorAssignments(prev => ({ ...prev, [portEditor.name]: assignments }));
    } catch (assignErr) {
      console.warn("[openTarget] Failed to load port editor assignments:", assignErr);
      showToast("Не удалось загрузить сохранённые назначения портов", "warning");
    }

    const displayTitle = title && title !== name ? `${title} (${name})` : portEditor.label || name;
    setTabs([...tabs, { id: name, title: displayTitle, icon: "dialog" }]);
    setTabContents({ ...tabContents, [name]: { type: "portEditor", data: portEditor } });
    setActiveTabId(name);
    return;
  } catch (portErr) {
    const tableErrStr = tableErr instanceof Error ? tableErr.message : String(tableErr);
    const curveErrStr = curveErr instanceof Error ? curveErr.message : String(curveErr);
    const dialogErrStr = dialogErr instanceof Error ? dialogErr.message : String(dialogErr);
    console.error(
      "[openTarget] Failed to open target:", name,
      "table error:", tableErr,
      "curve error:", curveErr,
      "dialog error:", dialogErr,
      "portEditor error:", portErr,
    );

    const detail =
      !curveErrStr.includes("not found") && !curveErrStr.includes("Definition not loaded")
        ? curveErrStr
        : !dialogErrStr.includes("not found") && !dialogErrStr.includes("Definition not loaded")
          ? dialogErrStr
          : tableErrStr;

    if (tableErrStr.includes("Definition not loaded")) {
      showToast(`Подождите — определение INI ещё загружается...`, "warning");
    } else {
      showToast(`Could not open "${title || name}" - ${detail}`, "warning");
    }
  }
}
