import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { AlertTriangle, Cpu } from 'lucide-react';
import { Dialog, Button } from '../common';
import type { IniCapabilities } from '../../types/app';
import { requestReconnect } from '../../utils/connectionWorkflow';
import './FirmwareUpdateDialog.css';

interface FirmwareFlasherInfo {
  stm32_programmer_cli: string | null;
  dfu_util: string | null;
  bootcommander: string | null;
  objcopy: string | null;
}

interface FirmwareCompanionSuggestion {
  companion_path: string | null;
  companion_kind: string;
  message: string;
}

interface FirmwareUpdateGuidance {
  recommended_method: string;
  file_kind: string;
  risk_level: string;
  warnings: string[];
  requires_risk_acknowledgement: boolean;
  suggested_file_hint: string;
  openblt_available: boolean;
  dfu_available: boolean;
}

interface FirmwareUpdateResult {
  success: boolean;
  log: string[];
  message: string;
  should_reconnect: boolean;
}

export interface FirmwareUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  iniCapabilities: IniCapabilities | null;
}

type UpdateMethod = 'dfu' | 'openblt';
type DialogMode = 'update' | 'recovery';

export function FirmwareUpdateDialog({
  isOpen,
  onClose,
  isConnected,
  iniCapabilities,
}: FirmwareUpdateDialogProps) {
  const [mode, setMode] = useState<DialogMode>('update');
  const [firmwarePath, setFirmwarePath] = useState<string | null>(null);
  const [bootloaderPath, setBootloaderPath] = useState<string | null>(null);
  const [binFlashAddress, setBinFlashAddress] = useState('0x08008000');
  const [fullErase, setFullErase] = useState(true);
  const [method, setMethod] = useState<UpdateMethod>('openblt');
  const [flasherInfo, setFlasherInfo] = useState<FirmwareFlasherInfo | null>(null);
  const [guidance, setGuidance] = useState<FirmwareUpdateGuidance | null>(null);
  const [companion, setCompanion] = useState<FirmwareCompanionSuggestion | null>(null);
  const [acknowledgeRisk, setAcknowledgeRisk] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [shouldReconnect, setShouldReconnect] = useState(false);

  const dfuAvailable = !!iniCapabilities?.dfu_command_name;
  const openbltAvailable = !!iniCapabilities?.openblt_command_name;

  useEffect(() => {
    if (!isOpen) return;
    setLog([]);
    setError(null);
    setResultMessage(null);
    setShouldReconnect(false);
    setAcknowledgeRisk(false);
    setCompanion(null);
    invoke<FirmwareFlasherInfo>('get_firmware_flasher_info')
      .then(setFlasherInfo)
      .catch((e) => setError(String(e)));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (dfuAvailable) {
      setMethod('dfu');
    }
  }, [isOpen, dfuAvailable, openbltAvailable]);

  useEffect(() => {
    if (!isOpen || mode !== 'update') {
      setGuidance(null);
      return;
    }
    invoke<FirmwareUpdateGuidance>('get_firmware_update_guidance', {
      firmwarePath: firmwarePath ?? null,
      method,
    })
      .then(setGuidance)
      .catch(() => setGuidance(null));
  }, [isOpen, mode, firmwarePath, method]);

  useEffect(() => {
    if (!isOpen || !firmwarePath) {
      setCompanion(null);
      return;
    }
    invoke<FirmwareCompanionSuggestion>('suggest_firmware_companion', {
      firmwarePath,
    })
      .then(setCompanion)
      .catch(() => setCompanion(null));
  }, [isOpen, firmwarePath]);

  useEffect(() => {
    setAcknowledgeRisk(false);
  }, [firmwarePath, method]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const unlisten = listen<{ line: string }>('firmware-update:log', (event) => {
      setLog((prev) => [...prev, event.payload.line]);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [isOpen]);

  const browseFirmware = useCallback(async () => {
    const filters =
      method === 'dfu'
        ? [
            { name: 'Recommended', extensions: ['hex', 'dfu'] },
            { name: 'Raw binary (advanced)', extensions: ['bin'] },
            { name: 'All Files', extensions: ['*'] },
          ]
        : [
            { name: 'Recommended (rusEFI Console)', extensions: ['bin'] },
            { name: 'Other formats', extensions: ['hex', 'srec', 's19'] },
            { name: 'All Files', extensions: ['*'] },
          ];
    const selected = await open({
      title: 'Выберите файл прошивки',
      multiple: false,
      filters,
    });
    if (selected && typeof selected === 'string') {
      setFirmwarePath(selected);
      setError(null);
    }
  }, [method]);

  const browseBootloader = useCallback(async () => {
    const selected = await open({
      title: 'Выберите загрузчик OpenBLT',
      multiple: false,
      filters: [
        { name: 'Bootloader Images', extensions: ['bin', 'hex'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (selected && typeof selected === 'string') {
      setBootloaderPath(selected);
      setError(null);
    }
  }, []);

  const browseRecoveryApp = useCallback(async () => {
    const selected = await open({
      title: 'Выберите прошивку приложения',
      multiple: false,
      filters: [
        { name: 'Application Images', extensions: ['bin', 'hex'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (selected && typeof selected === 'string') {
      setFirmwarePath(selected);
      setError(null);
    }
  }, []);

  const isBinFirmware = firmwarePath?.toLowerCase().endsWith('.bin') ?? false;
  const riskAckRequired = guidance?.requires_risk_acknowledgement ?? false;
  const riskAckSatisfied = !riskAckRequired || acknowledgeRisk;
  const openbltNeedsObjcopy = method === 'openblt' && isBinFirmware && !flasherInfo?.objcopy;

  const canFlash =
    mode === 'recovery'
      ? bootloaderPath &&
        firmwarePath &&
        binFlashAddress.trim().length > 0 &&
        !!flasherInfo?.stm32_programmer_cli
      : isConnected &&
        firmwarePath &&
        riskAckSatisfied &&
        !openbltNeedsObjcopy &&
        (method !== 'dfu' || !isBinFirmware || binFlashAddress.trim().length > 0) &&
        ((method === 'dfu' &&
          dfuAvailable &&
          (flasherInfo?.stm32_programmer_cli || flasherInfo?.dfu_util)) ||
          (method === 'openblt' && openbltAvailable && flasherInfo?.bootcommander));

  const handleUpdate = useCallback(async () => {
    if (!firmwarePath) return;
    setIsUpdating(true);
    setError(null);
    setResultMessage(null);
    setShouldReconnect(false);
    setLog([]);
    try {
      const result =
        mode === 'recovery'
          ? await invoke<FirmwareUpdateResult>('recover_ecu_firmware_dfu', {
              bootloaderPath,
              appFirmwarePath: firmwarePath,
              appFlashAddress: binFlashAddress,
              fullErase,
            })
          : await invoke<FirmwareUpdateResult>('update_ecu_firmware', {
              firmwarePath,
              method,
              binFlashAddress: isBinFirmware ? binFlashAddress : null,
              acknowledgeRisk,
            });
      setLog(result.log);
      setResultMessage(result.message);
      setShouldReconnect(result.should_reconnect);
      if (!result.success) {
        setError(result.message);
      } else if (result.should_reconnect) {
        requestReconnect({
          source: 'firmware-update',
          delayMs: 8000,
          retries: 10,
        });
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setIsUpdating(false);
    }
  }, [
    firmwarePath,
    mode,
    bootloaderPath,
    binFlashAddress,
    fullErase,
    method,
    isBinFirmware,
    acknowledgeRisk,
  ]);

  const missingFlasher =
    mode === 'recovery'
      ? !flasherInfo?.stm32_programmer_cli
      : method === 'dfu'
        ? !flasherInfo?.stm32_programmer_cli && !flasherInfo?.dfu_util
        : !flasherInfo?.bootcommander;

  const showMethodHint =
    guidance &&
    guidance.recommended_method !== method &&
    mode === 'update' &&
    firmwarePath;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Обновить прошивку ЭБУ"
      size="lg"
      closeOnBackdrop={!isUpdating}
      className="firmware-update-dialog"
    >
      <Dialog.Body>
        <div className="firmware-update-intro">
          <Cpu size={18} aria-hidden />
          <p>
            {mode === 'recovery'
              ? 'Восстановите ЭБУ, который перестал загружаться после прошивки по DFU. Вручную переведите плату в режим DFU (кнопка PROG + выключение и включение питания) — подключение для тюнинга не требуется.'
              : 'Прошейте новую прошивку в ЭБУ. Связь для тюнинга прервётся, пока ЭБУ перезагружается в режим загрузчика.'}
          </p>
        </div>

        <div className="firmware-update-field">
          <label>Режим</label>
          <div className="firmware-update-methods">
            <label className="firmware-method-option">
              <input
                type="radio"
                name="fw-mode"
                value="update"
                checked={mode === 'update'}
                onChange={() => setMode('update')}
                disabled={isUpdating}
              />
              <span>
                <strong>Обычное обновление</strong> — ЭБУ работает и подключён
              </span>
            </label>
            <label className="firmware-method-option">
              <input
                type="radio"
                name="fw-mode"
                value="recovery"
                checked={mode === 'recovery'}
                onChange={() => setMode('recovery')}
                disabled={isUpdating}
              />
              <span>
                <strong>Восстановление через DFU</strong> — ECU won&apos;t boot (re-flash OpenBLT + app)
              </span>
            </label>
          </div>
        </div>

        {mode === 'recovery' && (
          <>
            <div className="firmware-update-warning">
              Использовать <code>rusefi.hex</code> or <code>rusefi.bin</code> from{' '}
              <code>firmware/build/</code>. Восстановление заново прошивает загрузчик OpenBLT по адресу{' '}
              <code>0x08000000</code> и приложение по адресу <code>0x08008000</code>.
            </div>

            <div className="firmware-update-field">
              <label>Загрузчик OpenBLT</label>
              <div className="firmware-file-row">
                <code className="firmware-file-path">
                  {bootloaderPath ?? 'Файл не выбран'}
                </code>
                <Button
                  variant="secondary"
                  onClick={() => void browseBootloader()}
                  disabled={isUpdating}
                >
                  Обзор…
                </Button>
              </div>
              <p className="firmware-flasher-hint">
                Из вашей сборки прошивки:{' '}
                <code>firmware/bootloader/blbuild/openblt_&lt;board&gt;.bin</code>
              </p>
            </div>

            <div className="firmware-update-field">
              <label>Прошивка приложения</label>
              <div className="firmware-file-row">
                <code className="firmware-file-path">
                  {firmwarePath ?? 'Файл не выбран'}
                </code>
                <Button
                  variant="secondary"
                  onClick={() => void browseRecoveryApp()}
                  disabled={isUpdating}
                >
                  Обзор…
                </Button>
              </div>
              <p className="firmware-flasher-hint">
                Рекомендуется: <code>firmware/build/rusefi.hex</code>
              </p>
            </div>

            <div className="firmware-update-field">
              <label htmlFor="recovery-app-address">Адрес flash приложения</label>
              <input
                id="recovery-app-address"
                className="firmware-address-input"
                value={binFlashAddress}
                onChange={(e) => setBinFlashAddress(e.target.value)}
                disabled={isUpdating}
                spellCheck={false}
                placeholder="0x08008000"
              />
            </div>

            <label className="firmware-checkbox-option">
              <input
                type="checkbox"
                checked={fullErase}
                onChange={(e) => setFullErase(e.target.checked)}
                disabled={isUpdating}
              />
              <span>
                Полное стирание чипа перед прошивкой (рекомендуется для STM32F7 — обязательно после неудачного обновления)
              </span>
            </label>

            <div className="firmware-update-field">
              <label>Найденные инструменты прошивки</label>
              <ul className="firmware-flasher-list">
                <li className={flasherInfo?.stm32_programmer_cli ? 'ok' : 'missing'}>
                  STM32CubeProgrammer CLI: {flasherInfo?.stm32_programmer_cli ?? 'not found'}
                </li>
              </ul>
            </div>
          </>
        )}

        {mode === 'update' && (
          <>
            {!dfuAvailable && !openbltAvailable && (
              <div className="firmware-update-warning">
                В этом определении ЭБУ нет команд обновления прошивки (<code>cmd_dfu</code> /{' '}
                <code>cmd_openblt</code>).
              </div>
            )}

            {(dfuAvailable || openbltAvailable) && (
              <>
                <div className="firmware-update-warning caution">
                  <AlertTriangle size={16} aria-hidden />
                  <span>
                    <strong>Обновление прошивки по последовательному порту отключено.</strong> Использовать консоль rusEFI с{' '}
                    <code>firmware/build/rusefi.bin</code>. Ниже только восстановление через DFU (ЭБУ должен быть в режиме загрузчика STM32).
                  </span>
                </div>

                <div className="firmware-update-field">
                  <label>Файл прошивки</label>
                  <div className="firmware-file-row">
                    <code className="firmware-file-path">
                      {firmwarePath ?? 'Файл не выбран'}
                    </code>
                    <Button
                      variant="secondary"
                      onClick={() => void browseFirmware()}
                      disabled={isUpdating}
                    >
                      Обзор…
                    </Button>
                  </div>
                  <p className="firmware-flasher-hint">
                    Из вашей папки сборки:{' '}
                    <code>{guidance?.suggested_file_hint ?? 'firmware/build/rusefi.bin'}</code>
                  </p>
                </div>

                {companion?.message && (
                  <div className="firmware-update-warning note">
                    <p>{companion.message}</p>
                  </div>
                )}

                {guidance && guidance.warnings.length > 0 && (
                  <div
                    className={`firmware-update-warning caution firmware-risk-${guidance.risk_level}`}
                  >
                    <AlertTriangle size={16} aria-hidden />
                    <div>
                      <strong className="firmware-risk-label">
                        {guidance.risk_level === 'high'
                          ? 'Высокий риск'
                          : guidance.risk_level === 'medium'
                            ? 'Внимание'
                            : 'Заметка'}
                      </strong>
                      <ul className="firmware-guidance-warnings">
                        {guidance.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {showMethodHint && (
                  <div className="firmware-update-field">
                    <Button
                      variant="secondary"
                      onClick={() => setMethod(guidance!.recommended_method as UpdateMethod)}
                      disabled={isUpdating}
                    >
                      Переключиться на рекомендуемый метод (
                      {guidance!.recommended_method === 'openblt'
                        ? 'Последовательный / rusefi.bin'
                        : 'DFU / rusefi.hex'}
                      )
                    </Button>
                  </div>
                )}

                {method === 'dfu' && isBinFirmware && (
                  <div className="firmware-update-field">
                    <label htmlFor="bin-flash-address">Адрес бинарного flash</label>
                    <input
                      id="bin-flash-address"
                      className="firmware-address-input"
                      value={binFlashAddress}
                      onChange={(e) => setBinFlashAddress(e.target.value)}
                      disabled={isUpdating}
                      spellCheck={false}
                      placeholder="0x08008000"
                    />
                    <p className="firmware-flasher-hint">
                      Нужно только для «сырого» .bin — предпочтите <code>rusefi.hex</code> instead.
                    </p>
                  </div>
                )}

                {riskAckRequired && (
                  <label className="firmware-checkbox-option firmware-risk-ack">
                    <input
                      type="checkbox"
                      checked={acknowledgeRisk}
                      onChange={(e) => setAcknowledgeRisk(e.target.checked)}
                      disabled={isUpdating}
                    />
                    <span>
                      Я понимаю, что это обновление очень рискованно и может «окирпичить» ЭБУ, если загрузчик отсутствует или повреждён.
                    </span>
                  </label>
                )}

                <div className="firmware-update-field">
                  <label>Найденные инструменты прошивки</label>
                  <ul className="firmware-flasher-list">
                    {method === 'dfu' ? (
                      <>
                        <li className={flasherInfo?.stm32_programmer_cli ? 'ok' : 'missing'}>
                          STM32CubeProgrammer CLI:{' '}
                          {flasherInfo?.stm32_programmer_cli ?? 'not found'}
                        </li>
                        <li className={flasherInfo?.dfu_util ? 'ok' : 'missing'}>
                          dfu-util: {flasherInfo?.dfu_util ?? 'not found'}
                        </li>
                      </>
                    ) : (
                      <>
                        <li className={flasherInfo?.bootcommander ? 'ok' : 'missing'}>
                          BootCommander: {flasherInfo?.bootcommander ?? 'not found'}
                        </li>
                        <li className={flasherInfo?.objcopy ? 'ok' : 'missing'}>
                          arm-none-eabi-objcopy: {flasherInfo?.objcopy ?? 'not found'}
                        </li>
                      </>
                    )}
                  </ul>
                  {missingFlasher && (
                    <p className="firmware-flasher-hint">
                      {method === 'dfu' ? (
                        <>
                          Установить{' '}
                          <a
                            href="https://www.st.com/en/development-tools/stm32cubeprog.html"
                            target="_blank"
                            rel="noreferrer"
                          >
                            STM32CubeProgrammer
                          </a>{' '}
                          для восстановления по DFU с <code>rusefi.hex</code>.
                        </>
                      ) : (
                        <>
                          Установить{' '}
                          <a
                            href="https://www.feaser.com/openblt/doku.php?id=manual:bootcommander"
                            target="_blank"
                            rel="noreferrer"
                          >
                            OpenBLT BootCommander
                          </a>{' '}
                          для обновлений по последовательному порту. <code>arm-none-eabi-objcopy</code> (из вашей цепочки сборки rusEFI) преобразует <code>rusefi.bin</code> automatically.
                        </>
                      )}
                    </p>
                  )}
                  {openbltNeedsObjcopy && (
                    <p className="firmware-flasher-hint">
                      Добавьте тулчейн ARM GCC в PATH — тот же, которым компилируется rusEFI (содержит <code>arm-none-eabi-objcopy</code>).
                    </p>
                  )}
                </div>

                {!isConnected && (
                  <div className="firmware-update-warning">
                    Подключитесь к ЭБУ перед обновлением прошивки.
                  </div>
                )}

                <div className="firmware-update-warning caution">
                  <AlertTriangle size={16} aria-hidden />
                  <span>
                    Не отключайте питание USB во время прошивки. После обновления по DFU выключите и включите питание ЭБУ перед повторным подключением.
                  </span>
                </div>
              </>
            )}
          </>
        )}

        {missingFlasher && mode === 'recovery' && (
          <p className="firmware-flasher-hint">
            Установите STM32CubeProgrammer и убедитесь, что STM32_Programmer_CLI доступен.
          </p>
        )}

        {error && <div className="firmware-update-error">{error}</div>}
        {resultMessage && !error && (
          <div className="firmware-update-success">
            {resultMessage}
            {shouldReconnect && (
              <p className="firmware-reconnect-hint">
                Автоматическое переподключение… Если ЭБУ не вернётся, нажмите «Переподключиться» ниже.
              </p>
            )}
          </div>
        )}

        {log.length > 0 && (
          <div className="firmware-update-log">
            {log.map((line, idx) => (
              <div key={`${idx}-${line}`} className="firmware-update-log-line">
                {line}
              </div>
            ))}
          </div>
        )}
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="secondary" onClick={onClose} disabled={isUpdating}>
          Закрыть
        </Button>
        {shouldReconnect && !isUpdating && (
          <Button
            variant="secondary"
            onClick={() =>
              requestReconnect({
                source: 'firmware-update-manual',
                delayMs: 0,
                retries: 6,
              })
            }
          >
            Переподключиться
          </Button>
        )}
        <Button
          variant="primary"
          onClick={() => void handleUpdate()}
          disabled={!canFlash || isUpdating}
        >
          {isUpdating
            ? mode === 'recovery'
              ? 'Восстановление…'
              : 'Обновление…'
            : mode === 'recovery'
              ? 'Восстановить ЭБУ'
              : 'Обновить прошивку'}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
