//! Hot Key Manager
//!
//! Manages global keyboard shortcuts for table editing, dialogs, and navigation.
//! Based on standard ECU tuning software keyboard shortcuts.

import { invoke } from "@tauri-apps/api/core";

export interface Hotkey {
  keys: string;
  description: string;
}

export class HotkeyManager {
  private shortcuts: Record<string, Hotkey>;
  private customBindings: Record<string, string> = {};
  
  constructor() {
    this.shortcuts = {};
    this.initializeShortcuts();
  }
  
  /**
   * Load custom hotkey bindings from storage.
   * Call this after constructing the manager.
   */
  async loadCustomBindings(): Promise<void> {
    try {
      this.customBindings = await invoke<Record<string, string>>('get_hotkey_bindings');
    } catch (error) {
      console.warn('Failed to load custom hotkey bindings:', error);
      this.customBindings = {};
    }
  }
  
  private initializeShortcuts(): void {
    // Table navigation (2D Table help.html)
    this.shortcuts["ArrowUp"] = {
      keys: "Up, Down, Left, Right",
      description: "Перемещение по ячейкам таблицы",
    };
    this.shortcuts["ArrowDown"] = {
      keys: "Down",
      description: "Перемещение вниз по таблице",
    };
    this.shortcuts["ArrowLeft"] = {
      keys: "Left",
      description: "Перемещение влево по таблице",
    };
    this.shortcuts["ArrowRight"] = {
      keys: "Right",
      description: "Перемещение вправо по таблице",
    };
    
    // Table editing shortcuts
    this.shortcuts["="] = {
      keys: "=",
      description: "Задать выбранным ячейкам заданное пользователем значение",
    };
    this.shortcuts[">"] = {
      keys: ">, +, =, ., q",
      description: "Увеличить выбранные ячейки на величину шага",
    };
    this.shortcuts["<"] = {
      keys: "<, -, ,, _",
      description: "Уменьшить выбранные ячейки на величину шага",
    };
    this.shortcuts["*"] = {
      keys: "*",
      description: "Масштабировать выбранные ячейки на заданную пользователем величину",
    };
    this.shortcuts["/"] = {
      keys: "/",
      description: "Интерполировать выбранные ячейки между углами",
    };
    this.shortcuts["s"] = {
      keys: "s",
      description: "Сгладить таблицу с заданным коэффициентом",
    };
    
    // Dialog shortcuts
    this.shortcuts["Ctrl+S"] = {
      keys: "Ctrl+S",
      description: "Сохранить текущий диалог",
    };
    this.shortcuts["Ctrl+Z"] = {
      keys: "Ctrl+Z",
      description: "Отменить последнюю операцию",
    };
    this.shortcuts["Ctrl+Y"] = {
      keys: "Ctrl+Y",
      description: "Повторить последнюю операцию",
    };
    this.shortcuts["Escape"] = {
      keys: "Escape",
      description: "Отменить текущую операцию или закрыть диалог",
    };
    
    // Navigation shortcuts
    this.shortcuts["F"] = {
      keys: "F",
      description: "Перейти к текущей позиции или открыть на весь экран",
    };
    this.shortcuts["Tab"] = {
      keys: "Tab",
      description: "Перейти к следующему виду или таблице",
    };
    
    // Table-specific shortcuts
    this.shortcuts["G"] = {
      keys: "G",
      description: "Перейти к активной позиции",
    };
    this.shortcuts["F"] = {
      keys: "F",
      description: "Включить/выключить режим слежения",
    };
    this.shortcuts["M"] = {
      keys: "M",
      description: "Увеличить угол рыскания на 10°",
    };
    this.shortcuts["K"] = {
      keys: "K",
      description: "Уменьшить угол рыскания на 10°",
    };
    this.shortcuts["N"] = {
      keys: "N",
      description: "Увеличить угол крена на 10°",
    };
    this.shortcuts["J"] = {
      keys: "J",
      description: "Уменьшить угол крена на 10°",
    };
    this.shortcuts["Z"] = {
      keys: "Z",
      description: "Показать вид таблицы сверху",
    };
    this.shortcuts["Ctrl+C"] = {
      keys: "Ctrl+C",
      description: "Копировать выбранные ячейки",
    };
    this.shortcuts["Ctrl+V"] = {
      keys: "Ctrl+V",
      description: "Вставить ячейки",
    };
    this.shortcuts["Ctrl+Shift+>"] = {
      keys: "Ctrl+Shift+>",
      description: "Несколько увеличений на заданную пользователем величину",
    };
    this.shortcuts["Ctrl+Shift+<"] = {
      keys: "Ctrl+Shift+<",
      description: "Несколько уменьшений на заданную пользователем величину",
    };
  }
  
  public getShortcut(keys: string): Hotkey | undefined {
    return this.shortcuts[keys];
  }
  
  /**
   * Get the effective key binding for an action.
   * Returns custom binding if set, otherwise returns the action ID as default.
   * 
   * @param actionId - The action identifier (e.g., 'table.navigateUp')
   * @returns The key binding (e.g., 'ArrowUp')
   */
  public getBindingForAction(actionId: string): string {
    return this.customBindings[actionId] || '';
  }
  
  /**
   * Check if a key combination matches an action's binding.
   * 
   * @param actionId - The action identifier
   * @param keyCombo - The key combination from keyboard event (e.g., 'ArrowUp')
   * @returns true if the key matches the bound shortcut for this action
   */
  public matchesBinding(actionId: string, keyCombo: string): boolean {
    const bound = this.getBindingForAction(actionId);
    return bound === keyCombo;
  }
  
  public getAllShortcuts(): Record<string, Hotkey> {
    return { ...this.shortcuts };
  }
  
  /**
   * Get all custom bindings.
   */
  public getCustomBindings(): Record<string, string> {
    return { ...this.customBindings };
  }
}
