import React, { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { promptControllerCommand } from './ControllerCommandDialog';
import './EcuConsole.css';

interface EcuConsoleProps {
  ecuType: string;
  isConnected: boolean;
  dfuCommandName?: string | null;
}

export const EcuConsole: React.FC<EcuConsoleProps> = ({ ecuType, isConnected, dfuCommandName }) => {
  const [commandInput, setCommandInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyCopy, setHistoryCopy] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [enableFastComms, setEnableFastComms] = useState(true);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  // Auto-scroll output to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  const loadHistory = async () => {
    try {
      const hist = await invoke<string[]>('get_console_history');
      setHistory(hist);
      setHistoryCopy(hist);
    } catch (err) {
      console.error('Failed to load console history:', err);
    }
  };

  const handleSendCommand = async () => {
    if (!commandInput.trim()) {
      return;
    }

    const cmd = commandInput.trim();
    setCommandInput('');
    setIsLoading(true);
    setHistoryIndex(-1);

    try {
      const response = await invoke<string>('send_console_command', {
        command: cmd,
      });

      // Split multi-line responses into individual lines for display
      const responseLines = response.split('\n').filter(line => line.trim().length > 0);
      setHistory((prev) => [...prev, `> ${cmd}`, ...responseLines.map(l => `← ${l}`)]);
      setHistoryCopy((prev) => [...prev, `> ${cmd}`, ...responseLines.map(l => `← ${l}`)]);
    } catch (err: any) {
      const errorMsg = err?.message || String(err) || 'Неизвестная ошибка';
      setHistory((prev) => [...prev, `> ${cmd}`, `ERROR: ${errorMsg}`]);
      setHistoryCopy((prev) => [...prev, `> ${cmd}`, `ERROR: ${errorMsg}`]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateHistory(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateHistory(1);
    }
  };

  const navigateHistory = (direction: number) => {
    const newIndex = historyIndex + direction;
    const commands = historyCopy.filter((line) => line.startsWith('> ')).map((line) => line.slice(2));

    if (newIndex < -1 || newIndex >= commands.length) {
      setHistoryIndex(-1);
      setCommandInput('');
      return;
    }

    if (newIndex === -1) {
      setCommandInput('');
    } else {
      setCommandInput(commands[commands.length - 1 - newIndex]);
    }
    setHistoryIndex(newIndex);
  };

  const handleClearHistory = async () => {
    try {
      await invoke('clear_console_history');
      setHistory([]);
      setHistoryCopy([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const isFome = ecuType.includes('FOME');

  const quickCommands = [
    { label: 'help', tooltip: 'Показать все поддерживаемые команды' },
    { label: 'status', tooltip: 'Показать состояние ЭБУ' },
    { label: 'hello', tooltip: 'Показать версию прошивки' },
    { label: 'triggerinfo', tooltip: 'Состояние триггера и диагностика' },
    { label: 'tsinfo', tooltip: 'Сводка обмена TunerStudio' },
    { label: 'tempinfo', tooltip: 'Информация о датчиках CLT и IAT' },
    { label: 'tpsinfo', tooltip: 'Информация о датчике TPS' },
    { label: 'mapinfo', tooltip: 'Информация о датчике MAP' },
    { label: 'analoginfo', tooltip: 'Входные значения АЦП' },
    { label: 'caninfo', tooltip: 'Статистика подсистемы CAN' },
    { label: 'sdinfo', tooltip: 'Использование SD/MMC-карты' },
  ];

  const handleQuickCommand = (cmd: string) => {
    setCommandInput(cmd);
    // Execute immediately
    setIsLoading(true);
    setHistoryIndex(-1);
    invoke<string>('send_console_command', { command: cmd })
      .then((response) => {
        const responseLines = response.split('\n').filter(line => line.trim().length > 0);
        setHistory((prev) => [...prev, `> ${cmd}`, ...responseLines.map(l => `\u2190 ${l}`)]);
        setHistoryCopy((prev) => [...prev, `> ${cmd}`, ...responseLines.map(l => `\u2190 ${l}`)]);
      })
      .catch((err: any) => {
        const errorMsg = err?.message || String(err) || 'Неизвестная ошибка';
        setHistory((prev) => [...prev, `> ${cmd}`, `ERROR: ${errorMsg}`]);
        setHistoryCopy((prev) => [...prev, `> ${cmd}`, `ERROR: ${errorMsg}`]);
      })
      .finally(() => {
        setIsLoading(false);
        setCommandInput('');
        inputRef.current?.focus();
      });
  };

  return (
    <div className="ecu-console">
      <div className="console-header">
        <div className="header-title">
          <span className="title-text">Консоль ЭБУ — {ecuType}</span>
          {!isConnected && <span className="disconnected-badge">ОТКЛЮЧЕНО</span>}
        </div>
        <div className="header-controls">
          {dfuCommandName && (
            <button
              className="btn-small btn-dfu"
              onClick={() => promptControllerCommand({
                commandName: dfuCommandName,
                label: 'Войти в режим DFU',
                description: 'Переведите ЭБУ в режим DFU (обновление прошивки). Подключение прервётся — используйте программатор вашей платы для обновления прошивки.',
              })}
              disabled={isLoading || !isConnected}
              title="Перевести ЭБУ в режим DFU для прошивки"
            >
              Войти в DFU
            </button>
          )}
          {isFome && (
            <label className="fast-comms-toggle">
              <input
                type="checkbox"
                checked={enableFastComms}
                onChange={(e) => setEnableFastComms(e.target.checked)}
                disabled={isLoading}
              />
              <span>FOME Fast Comms</span>
            </label>
          )}
          <button
            className="btn-small"
            onClick={handleClearHistory}
            disabled={isLoading || history.length === 0}
            title="Очистить историю команд"
          >
            Очистить историю
          </button>
        </div>
      </div>

      <div className="console-output" ref={outputRef}>
        {history.length === 0 ? (
          <div className="output-placeholder">
            <p>Добро пожаловать в консоль ЭБУ</p>
            <p className="hint">Введите команду и нажмите Enter для выполнения</p>
            <p className="hint">Стрелки вверх/вниз — навигация по истории команд</p>
            <p className="hint example">Пример: <code>help</code>, <code>status</code>, <code>set someVar 100</code></p>
          </div>
        ) : (
          <>
            {history.map((line, idx) => (
              <div key={idx} className={`console-line ${line.startsWith('>') ? 'command' : line.startsWith('ERROR') ? 'error' : 'response'}`}>
                <span className="line-prefix">{line.startsWith('>') ? '→' : line.startsWith('ERROR') ? '✗' : '←'}</span>
                <span className="line-content">{line.startsWith('← ') ? line.slice(2) : line}</span>
              </div>
            ))}
            {isLoading && (
              <div className="console-line loading">
                <span className="line-prefix">…</span>
                <span className="line-content">Ожидание ответа...</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="console-input-bar">
        <span className="input-prompt">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          className="console-input"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введите команду (help, status, hello, triggerinfo и т. д.)"
          disabled={isLoading || !isConnected}
          autoFocus
        />
        <button
          className="btn-send"
          onClick={handleSendCommand}
          disabled={isLoading || !isConnected || !commandInput.trim()}
          title="Отправить команду (Enter)"
        >
          {isLoading ? '⟳' : 'Отправить'}
        </button>
      </div>

      <div className="console-quick-commands">
        {quickCommands.map((qc) => (
          <button
            key={qc.label}
            className="quick-cmd-btn"
            onClick={() => handleQuickCommand(qc.label)}
            disabled={isLoading || !isConnected}
            title={qc.tooltip}
          >
            {qc.label}
          </button>
        ))}
      </div>

      {!isConnected && (
        <div className="console-notice">
          Подключитесь к ЭБУ, чтобы пользоваться консолью
        </div>
      )}
    </div>
  );
};
