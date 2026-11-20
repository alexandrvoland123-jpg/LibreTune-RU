import { useEffect, useRef } from 'react';
import { RotateCw } from 'lucide-react';
import { Dialog, Button } from '../../common';
import '../Dialogs.css';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConnectionDialogProps extends DialogProps {
  ports: string[];
  selectedPort: string;
  baudRate: number;
  timeoutMs: number;
  // Connection type and TCP settings
  connectionType?: 'Serial' | 'Tcp';
  onConnectionTypeChange?: (type: 'Serial' | 'Tcp') => void;
  tcpHost?: string;
  onTcpHostChange?: (host: string) => void;
  tcpPort?: number;
  onTcpPortChange?: (port: number) => void;
  
  connected: boolean;
  connecting: boolean;
  onPortChange: (port: string) => void;
  onBaudChange: (baud: number) => void;
  onTimeoutChange: (timeoutMs: number) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefreshPorts: () => void;
  statusMessage?: string;
  iniDefaults?: {
    default_baud_rate: number;
    timeout_ms: number;
    inter_write_delay: number;
    delay_after_port_open: number;
    message_envelope_format?: string | null;
    page_activation_delay: number;
  };
  onApplyIniDefaults?: () => void;
  runtimePacketMode?: 'Auto'|'ForceBurst'|'ForceOCH'|'Disabled';
  onRuntimePacketModeChange?: (mode: 'Auto'|'ForceBurst'|'ForceOCH'|'Disabled') => void;
  autoConnectEnabled?: boolean;
  rememberedPort?: string | null;
  connectionPhase?: string;
}

export function ConnectionDialog({ 
  isOpen, 
  onClose,
  ports,
  selectedPort,
  baudRate,
  timeoutMs,
  connectionType = 'Serial', // Default to Serial if not provided
  onConnectionTypeChange,
  tcpHost = '127.0.0.1',
  onTcpHostChange,
  tcpPort = 29001,
  onTcpPortChange,
  connected,
  connecting,
  onPortChange,
  onBaudChange,
  onTimeoutChange,
  onConnect,
  onDisconnect,
  onRefreshPorts,
  statusMessage,
  iniDefaults,
  onApplyIniDefaults,
  runtimePacketMode,
  onRuntimePacketModeChange,
  autoConnectEnabled,
  rememberedPort,
  connectionPhase,
}: ConnectionDialogProps) {
  // Track previous connected state to detect connection transitions
  const prevConnectedRef = useRef<boolean>(connected);

  // Auto-close only after a successful connect while the dialog is open.
  // Leave it open on failure so the user can retry / adjust settings.
  useEffect(() => {
    if (!isOpen) {
      prevConnectedRef.current = connected;
      return;
    }
    if (connected && !prevConnectedRef.current) {
      onClose();
    }
    prevConnectedRef.current = connected;
  }, [connected, isOpen, onClose]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Подключение к ЭБУ"
      size="md"
      closeOnBackdrop={!connecting}
    >
      <Dialog.Body>
          <div className="dialog-form-group">
            <label>Режим подключения</label>
            <div className="dialog-row radio-group" style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
                <label className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: connected ? 'default' : 'pointer' }}>
                  <input
                    type="radio"
                    checked={connectionType === 'Serial'}
                    onChange={() => onConnectionTypeChange?.('Serial')}
                    disabled={connected}
                  />
                  <span>Последовательный / USB</span>
                </label>
                <label className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: connected ? 'default' : 'pointer' }}>
                  <input
                    type="radio"
                    checked={connectionType === 'Tcp'}
                    onChange={() => onConnectionTypeChange?.('Tcp')}
                    disabled={connected}
                  />
                  <span>TCP / WiFi (симулятор)</span>
                </label>
            </div>
          </div>
          
          {connectionType === 'Serial' ? (
            <>
              <div className="dialog-form-group">
                <label>Последовательный порт</label>
                <div className="dialog-port-row">
                  <select 
                    value={selectedPort} 
                    onChange={(e) => onPortChange(e.target.value)}
                    disabled={connected}
                  >
                    {ports.length === 0 ? (
                      <option value="">Порты не найдены</option>
                    ) : (
                      ports.map((port) => (
                        <option key={port} value={port}>{port}</option>
                      ))
                    )}
                  </select>
                  <button onClick={onRefreshPorts} disabled={connected}>
                    <RotateCw size={14} /> Обновить
                  </button>
                </div>
                {rememberedPort && (
                  <p className="field-help">
                    Последний успешный порт: <code>{rememberedPort}</code>
                    {autoConnectEnabled && !connected
                      ? ' — auto-connect is enabled in Settings'
                      : ''}
                  </p>
                )}
              </div>
              
              <div className="dialog-form-group">
                <label>Скорость (бод)</label>
                <select 
                  value={baudRate} 
                  onChange={(e) => onBaudChange(Number(e.target.value))}
                  disabled={connected}
                >
                  <option value={115200}>115200</option>
                  <option value={57600}>57600</option>
                  <option value={38400}>38400</option>
                  <option value={19200}>19200</option>
                  <option value={9600}>9600</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="dialog-form-group">
                <label>Адрес хоста</label>
                <input
                  type="text"
                  className="dialog-input"
                  style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }}
                  value={tcpHost}
                  onChange={(e) => onTcpHostChange?.(e.target.value)}
                  disabled={connected}
                  placeholder="localhost"
                />
              </div>
              <div className="dialog-form-group">
                <label>TCP-порт</label>
                <input
                  type="number"
                  className="dialog-input"
                  style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }}
                  value={tcpPort}
                  onChange={(e) => onTcpPortChange?.(Number(e.target.value))}
                  disabled={connected}
                  placeholder="29001"
                />
              </div>
            </>
          )}

          <div className="dialog-form-group">
            <label>Таймаут</label>
            <select
              value={timeoutMs}
              onChange={(e) => onTimeoutChange(Number(e.target.value))}
              disabled={connected}
            >
              <option value={1000}>1000 ms</option>
              <option value={2000}>2000 ms</option>
              <option value={3000}>3000 ms</option>
              <option value={5000}>5000 ms</option>
            </select>
          </div>

          <div className="dialog-form-group">
            <label>Режим пакета реального времени</label>
            <select
              value={runtimePacketMode}
              onChange={(e) => onRuntimePacketModeChange && onRuntimePacketModeChange(e.target.value as any)}
              disabled={connected}
            >
              <option value={'Auto'}>Авто (рекомендуется)</option>
              <option value={'ForceBurst'}>Принудительный Burst</option>
              <option value={'ForceOCH'}>Принудительный OCH</option>
              <option value={'Disabled'}>Отключено (используйте Burst)</option>
            </select>
            <div className="field-help">Переопределение выбора пакета реального времени для отдельного подключения</div>
            <div className="field-help">OCH (блочное чтение в контроллере): использовать блочное чтение, заданное в INI, если ЭБУ его поддерживает (настраивается через <code>ochGetCommand</code> / <code>ochBlockSize</code>).</div>
          </div>



          {/* INI defaults display */}
          {iniDefaults && (
            <div className="dialog-form-group ini-defaults">
              <label>Значения INI по умолчанию</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Скорость:</strong> {iniDefaults.default_baud_rate}</div>
                <div><strong>Таймаут:</strong> {iniDefaults.timeout_ms} ms</div>
                <div><strong>interWriteDelay:</strong> {iniDefaults.inter_write_delay} ms</div>
                <div><strong>Задержка после открытия порта:</strong> {iniDefaults.delay_after_port_open} ms</div>
                <button className="primary-btn" style={{ marginTop: '8px' }} onClick={() => onApplyIniDefaults && onApplyIniDefaults()} disabled={connected === true ? false : false}>
                  Применить значения INI по умолчанию
                </button>
              </div>
            </div>
          )} 
          
          <div className="dialog-status">
            <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`} />
            {statusMessage
              ? statusMessage
              : connected
                ? 'Подключено'
                : connecting
                  ? 'Connecting...'
                  : connectionPhase === 'auto-connect-waiting'
                    ? `Waiting for ${rememberedPort ?? 'ECU'}…`
                    : connectionPhase === 'auto-connect'
                      ? `Auto-connecting${rememberedPort ? ` to ${rememberedPort}` : ''}…`
                      : 'Отключено'}
          </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="secondary" onClick={onClose}>Закрыть</Button>
        {connected ? (
          <Button variant="danger" onClick={onDisconnect}>
            Отключить
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={onConnect}
            disabled={connecting || !selectedPort}
          >
            {connecting ? 'Connecting...' : 'Подключить'}
          </Button>
        )}
      </Dialog.Footer>
    </Dialog>
  );
}
