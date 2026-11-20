import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from '../../contexts/ToastContext';
import './LuaConsole.css';

interface LuaConsoleProps {
  isConnected: boolean;
  luaScriptConstant: string | null;
}

const DEFAULT_SCRIPT = `-- ECU Lua script (uploaded to luaScript constant)
print('Hello from ECU Lua')

function onTick()
  -- Called periodically by the ECU
end
`;

export function LuaConsole({ isConnected, luaScriptConstant }: LuaConsoleProps) {
  const [script, setScript] = useState(DEFAULT_SCRIPT);
  const [output, setOutput] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [loadedFromEcu, setLoadedFromEcu] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const appendOutput = useCallback((lines: string[]) => {
    setOutput((prev) => [...prev, ...lines]);
  }, []);

  const sendConsoleCommand = useCallback(async (cmd: string) => {
    appendOutput([`> ${cmd}`]);
    try {
      const response = await invoke<string>('send_console_command', { command: cmd });
      const responseLines = response.split('\n').filter((line) => line.trim().length > 0);
      if (responseLines.length > 0) {
        appendOutput(responseLines.map((l) => `← ${l}`));
      }
      return response;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      appendOutput([`ERROR: ${errorMsg}`]);
      throw err;
    }
  }, [appendOutput]);

  const loadFromEcu = useCallback(async () => {
    if (!luaScriptConstant) {
      showToast('В этом определении ЭБУ нет константы luaScript.', 'warning');
      return;
    }
    setIsBusy(true);
    try {
      const value = await invoke<string>('get_constant_string_value', { name: luaScriptConstant });
      setScript(value || DEFAULT_SCRIPT);
      setLoadedFromEcu(true);
      appendOutput([`← Loaded ${luaScriptConstant} from ${isConnected ? 'ЭБУ' : 'tune file'}`]);
    } catch (err) {
      showToast(`Failed to load script: ${err}`, 'error');
    } finally {
      setIsBusy(false);
    }
  }, [appendOutput, isConnected, luaScriptConstant, showToast]);

  useEffect(() => {
    if (luaScriptConstant) {
      void loadFromEcu();
    }
  }, [luaScriptConstant]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleUpload = async () => {
    if (!luaScriptConstant) {
      showToast('В этом определении ЭБУ нет константы luaScript.', 'warning');
      return;
    }
    if (!isConnected) {
      showToast('Подключитесь к ЭБУ, чтобы загружать скрипты Lua.', 'warning');
      return;
    }

    setIsBusy(true);
    try {
      appendOutput([`> Uploading to ${luaScriptConstant}…`]);
      await invoke('update_constant_string', { name: luaScriptConstant, value: script });
      appendOutput(['← Script written to ECU RAM']);

      appendOutput(['> burn']);
      await invoke('burn_to_ecu');
      appendOutput(['← Burn complete']);

      await sendConsoleCommand('luareset');
      showToast('Скрипт Lua загружен, виртуальная машина сброшена', 'success');
    } catch (err) {
      showToast(`Upload failed: ${err}`, 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleRunSnippet = async () => {
    if (!isConnected) {
      showToast('Подключитесь к ЭБУ, чтобы выполнять сниппеты Lua.', 'warning');
      return;
    }

    const textarea = editorRef.current;
    const selected = textarea?.selectionStart !== textarea?.selectionEnd
      ? script.slice(textarea!.selectionStart, textarea!.selectionEnd).trim()
      : script.split('\n').find((line) => line.trim() && !line.trim().startsWith('--'))?.trim() ?? '';

    if (!selected) {
      showToast('Выделите код или добавьте строку без комментария для запуска.', 'warning');
      return;
    }

    setIsBusy(true);
    try {
      // rusEFI console: `lua <expression>` runs interactive Lua
      const oneLine = selected.replace(/\s+/g, ' ');
      await sendConsoleCommand(`lua ${oneLine}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleConsoleAction = async (cmd: string) => {
    if (!isConnected) {
      showToast('Сначала подключитесь к ЭБУ.', 'warning');
      return;
    }
    setIsBusy(true);
    try {
      await sendConsoleCommand(cmd);
    } finally {
      setIsBusy(false);
    }
  };

  const handleClearOutput = () => setOutput([]);

  if (!luaScriptConstant) {
    return (
      <div className="lua-console">
        <div className="lua-console-header">
          <div className="lua-console-title">Редактор Lua для ЭБУ</div>
        </div>
        <div className="lua-console-unavailable">
          <p>Это определение ЭБУ не содержит <code>luaScript</code> строковая константа.</p>
          <p className="hint">Скрипты Lua доступны на прошивках rusEFI, FOME и epicEFI с INI, поддерживающим Lua.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lua-console">
      <div className="lua-console-header">
        <div className="lua-console-title">
          Редактор Lua для ЭБУ
          {!isConnected && <span className="lua-disconnected-badge">ОТКЛЮЧЕНО</span>}
          {loadedFromEcu && isConnected && <span className="lua-sync-badge">СИНХРОНИЗИРОВАНО</span>}
        </div>
        <div className="lua-console-actions">
          <button className="lua-btn secondary" onClick={() => void loadFromEcu()} disabled={isBusy}>
            Загрузить из ЭБУ
          </button>
          <button className="lua-btn secondary" onClick={handleRunSnippet} disabled={isBusy || !isConnected}>
            Выполнить сниппет
          </button>
          <button className="lua-btn" onClick={() => void handleUpload()} disabled={isBusy || !isConnected}>
            {isBusy ? 'Выполняется…' : 'Загрузить + прошить + сброс'}
          </button>
          <button className="lua-btn secondary" onClick={handleClearOutput}>
            Очистить вывод
          </button>
        </div>
      </div>

      <textarea
        ref={editorRef}
        className="lua-console-editor"
        value={script}
        onChange={(e) => setScript(e.target.value)}
        spellCheck={false}
        disabled={isBusy}
        aria-label="Редактор скриптов Lua для ЭБУ"
      />

      <div className="lua-console-quick-actions">
        <button className="lua-quick-btn" disabled={isBusy || !isConnected} onClick={() => void handleConsoleAction('luareset')}>
          luareset
        </button>
        <button className="lua-quick-btn" disabled={isBusy || !isConnected} onClick={() => void handleConsoleAction('luamemory')}>
          luamemory
        </button>
        <button className="lua-quick-btn" disabled={isBusy || !isConnected} onClick={() => void handleConsoleAction('help')}>
          help
        </button>
      </div>

      <div className="lua-console-output" ref={outputRef}>
        {output.length === 0 ? (
          <div className="lua-console-empty">
            Отредактируйте скрипт выше, затем используйте <strong>Загрузить + прошить + сброс</strong> чтобы прошить его в ЭБУ. Используйте <strong>Выполнить сниппет</strong> для быстрого <code>lua</code> консольные тесты на выбранном коде.
          </div>
        ) : (
          output.map((line, idx) => (
            <div
              key={`${idx}-${line}`}
              className={`lua-console-line ${line.startsWith('>') ? 'command' : line.startsWith('ERROR') ? 'error' : 'response'}`}
            >
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
