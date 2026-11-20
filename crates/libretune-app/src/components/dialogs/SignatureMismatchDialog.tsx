//! Signature Mismatch Dialog
//!
//! Shown when the ECU signature doesn't match the loaded INI file.
//! Allows user to select a matching INI, continue anyway, or cancel.

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { AlertTriangle, Check, Download, RefreshCw, Globe, Wifi, WifiOff, Save, HelpCircle, FolderOpen } from "lucide-react";
import { Dialog, Button } from "../common";
import "./SignatureMismatchDialog.css";

export interface MatchingIniInfo {
  path: string;
  name: string;
  signature: string;
  match_type: "exact" | "partial" | "mismatch";
}

export interface SignatureMismatchInfo {
  ecu_signature: string;
  ini_signature: string;
  match_type: "exact" | "partial" | "mismatch";
  current_ini_path: string | null;
  matching_inis: MatchingIniInfo[];
}

interface OnlineIniEntry {
  source: string;
  name: string;
  signature: string | null;
  download_url: string;
  repo_path: string;
  size: number | null;
}

interface Props {
  isOpen: boolean;
  mismatchInfo: SignatureMismatchInfo | null;
  onClose: () => void;
  onSelectIni: (path: string) => void;
  onContinue: () => void;
}

export default function SignatureMismatchDialog({
  isOpen,
  mismatchInfo,
  onClose,
  onSelectIni,
  onContinue,
}: Props) {
  const [selectedIni, setSelectedIni] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [savingTune, setSavingTune] = useState(false);
  
  // Online search state
  const [showOnlineSearch, setShowOnlineSearch] = useState(false);
  const [onlineResults, setOnlineResults] = useState<OnlineIniEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [hasInternet, setHasInternet] = useState<boolean | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);

  // Auto-offer the online match on a genuine mismatch — TunerStudio does
  // this automatically rather than requiring the user to dig for a
  // "Search Online" button. Pre-fetches results as soon as a mismatch is
  // reported (not just when the user opens the online tab), and jumps
  // straight to that tab when there's no local match at all, since the
  // local tab has nothing useful to show in that case. Still requires an
  // explicit click to actually download anything (see handleDownload) —
  // this only automates the *search*, never applies an INI on its own.
  useEffect(() => {
    if (!mismatchInfo) return;
    if (mismatchInfo.matching_inis.length === 0) {
      setShowOnlineSearch(true);
    }
    checkConnectivity();
  }, [mismatchInfo?.ecu_signature]);

  // Check internet connectivity when online search is opened
  useEffect(() => {
    if (showOnlineSearch && hasInternet === null) {
      checkConnectivity();
    }
  }, [showOnlineSearch]);

  const checkConnectivity = async () => {
    try {
      const connected = await invoke<boolean>("check_internet_connectivity");
      setHasInternet(connected);
      if (connected && mismatchInfo) {
        searchOnline();
      }
    } catch (e) {
      console.error("Failed to check connectivity:", e);
      setHasInternet(false);
    }
  };

  const searchOnline = async () => {
    if (!mismatchInfo) return;
    
    setSearching(true);
    setSearchError(null);
    
    try {
      const response = await invoke<{ entries: OnlineIniEntry[] }>("search_online_inis", {
        signature: mismatchInfo.ecu_signature,
      });
      setOnlineResults(response.entries);
    } catch (e) {
      console.error("Failed to search online:", e);
      setSearchError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  };

  const handleDownload = async (entry: OnlineIniEntry) => {
    setDownloading(entry.download_url);
    
    try {
      const downloadedPath = await invoke<string>("download_ini", {
        downloadUrl: entry.download_url,
        name: entry.name,
        source: entry.source,
      });
      
      // Switch to the downloaded INI
      await invoke("update_project_ini", {
        iniPath: downloadedPath,
        forceResync: true,
      });
      
      onSelectIni(downloadedPath);
    } catch (e) {
      console.error("Failed to download INI:", e);
      setSearchError(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloading(null);
    }
  };

  const handleSaveEcuTune = async () => {
    setSavingTune(true);
    
    try {
      // Step 1: Sync ECU data first
      try {
        await invoke("sync_ecu_data");
      } catch (syncError) {
        throw new Error(
          `Failed to read tune from ECU: ${syncError instanceof Error ? syncError.message : String(syncError)}. ` +
          `Убедитесь, что ЭБУ подключён.`
        );
      }
      
      // Step 2: Save the current tune with a timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const filename = `ecu_backup_${timestamp}.msq`;
      
      try {
        await invoke("save_tune", {
          filename,
          includeMetadata: true, // Include metadata for complete backup
        });
      } catch (saveError) {
        throw new Error(
          `Failed to save tune file: ${saveError instanceof Error ? saveError.message : String(saveError)}`
        );
      }
      
      alert(`✓ ECU tune saved successfully as:\n${filename}\n\nYou can now safely switch INI files.`);
    } catch (e) {
      console.error("Failed to save ECU tune:", e);
      alert(`✗ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSavingTune(false);
    }
  };

  const handleBrowseIni = async () => {
    setBrowsing(true);
    try {
      const selected = await open({
        title: "Выберите файл определения INI",
        filters: [{ name: "INI Files", extensions: ["ini"] }],
        multiple: false,
        directory: false,
      });
      if (!selected) return;

      const filePath = selected as string;
      // Import the file into the repository, then apply it
      await invoke("import_ini", { sourcePath: filePath });
      await invoke("update_project_ini", {
        iniPath: filePath,
        forceResync: true,
      });
      onSelectIni(filePath);
    } catch (e) {
      console.error("Failed to browse/import INI:", e);
      alert(`Failed to load INI file: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBrowsing(false);
    }
  };

  const handleSelectIni = async () => {
    if (!selectedIni) return;
    
    setSwitching(true);
    try {
      await invoke("update_project_ini", {
        iniPath: selectedIni,
        forceResync: true,
      });
      onSelectIni(selectedIni);
    } catch (e) {
      console.error("Failed to switch INI:", e);
    } finally {
      setSwitching(false);
    }
  };

  if (!mismatchInfo) return null;

  const hasExactMatch = mismatchInfo.matching_inis.some(
    (ini) => ini.match_type === "exact"
  );

  const titleNode = (
    <>
      <AlertTriangle className="warning-icon" size={20} />
      Несоответствие сигнатуры INI
    </>
  );

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={titleNode}
      size="lg"
      className="signature-mismatch-dialog"
      closeOnBackdrop={!switching && !savingTune && downloading === null}
      closeOnEscape={!switching && !savingTune && downloading === null}
    >
      <Dialog.Body className="signature-mismatch-content">
          <div className="signature-comparison">
            <div className="signature-row">
              <span className="label">Сигнатура ЭБУ:</span>
              <code className="signature ecu">{mismatchInfo.ecu_signature}</code>
            </div>
            <div className="signature-row">
              <span className="label">Сигнатура INI:</span>
              <code className="signature ini">{mismatchInfo.ini_signature}</code>
            </div>
          </div>

          <p className="warning-text">
            {mismatchInfo.match_type === "partial"
              ? "The ECU signature partially matches the loaded INI file. This usually means the ECU firmware and INI file are from different versions of the same platform (e.g., different release dates). Using a partial match may work, but some features might not display correctly."
              : "Сигнатура ЭБУ не совпадает с загруженным файлом INI. Неверный INI может вызвать ошибки чтения/записи или неправильное отображение данных."}
          </p>

          {/* Save ECU Tune First Option */}
          <div className="save-ecu-option">
            <button 
              className="save-ecu-btn" 
              onClick={handleSaveEcuTune}
              disabled={savingTune}
              aria-label="Сохранить текущий тюн ЭБУ на ПК перед сменой файлов INI"
            >
              {savingTune ? (
                <>
                  <RefreshCw size={16} className="spinning" />
                  Сохранение тюна ЭБУ...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Сначала сохраните текущий тюн ЭБУ
                </>
              )}
            </button>
            <p className="save-ecu-hint">
              <HelpCircle size={14} />
              Сохраните текущий тюн ЭБУ на ПК перед сменой файлов INI. Это защитит ваш существующий тюн.
            </p>
          </div>

          {!showOnlineSearch ? (
            <>
              {mismatchInfo.matching_inis.length > 0 ? (
                <div className="matching-inis-section">
                  <h3>
                    {hasExactMatch
                      ? "Найденные подходящие файлы INI:"
                      : "Найдены похожие файлы INI:"}
                  </h3>
                  <div className="ini-list">
                    {mismatchInfo.matching_inis.map((ini) => (
                      <div
                        key={ini.path}
                        className={`ini-item ${selectedIni === ini.path ? "selected" : ""} ${ini.match_type}`}
                        onClick={() => setSelectedIni(ini.path)}
                      >
                        <div className="ini-info">
                          <span className="ini-name">{ini.name}</span>
                          <code className="ini-signature">{ini.signature}</code>
                        </div>
                        <div className="match-badge">
                          {ini.match_type === "exact" ? (
                            <span className="badge exact">
                              <Check size={12} /> Точно
                            </span>
                          ) : (
                            <span 
                              className="badge partial" 
                              title="Частичное совпадение: префикс сигнатуры совпадает, но версия отличается. Возможна ограниченная совместимость."
                              tabIndex={0}
                              role="tooltip"
                              aria-label="Сведения о частичном совпадении"
                            >
                              Частично
                              <HelpCircle size={12} className="help-icon" />
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="no-matches">
                  <p>В локальном репозитории не найдено подходящих файлов INI.</p>
                </div>
              )}
              
              <button
                className="browse-ini-btn"
                onClick={handleBrowseIni}
                disabled={browsing}
              >
                {browsing ? (
                  <><RefreshCw size={16} className="spinning" /> Импорт...</>
                ) : (
                  <><FolderOpen size={16} /> Выбрать файл INI...</>
                )}
              </button>

              <button 
                className="search-online-btn" 
                onClick={() => setShowOnlineSearch(true)}
              >
                <Globe size={16} />
                Поиск в интернете...
              </button>
            </>
          ) : (
            <div className="online-search-section">
              <div className="online-search-header">
                <h3>
                  <Globe size={16} />
                  Поиск INI в интернете
                </h3>
                <button 
                  className="back-btn"
                  onClick={() => setShowOnlineSearch(false)}
                >
                  ← Назад к локальным
                </button>
              </div>
              
              {hasInternet === null ? (
                <div className="checking-connectivity">
                  <RefreshCw size={16} className="spinning" />
                  Проверка подключения к интернету...
                </div>
              ) : hasInternet === false ? (
                <div className="no-internet">
                  <WifiOff size={24} />
                  <p>Нет интернета</p>
                  <p className="subtitle">Не удалось связаться с GitHub. Проверьте подключение и повторите.</p>
                  <button className="retry-btn" onClick={checkConnectivity}>
                    <RefreshCw size={14} />
                    Повторить
                  </button>
                </div>
              ) : searching ? (
                <div className="searching">
                  <RefreshCw size={20} className="spinning" />
                  <p>Поиск в репозиториях Speeduino и rusEFI...</p>
                </div>
              ) : searchError ? (
                <div className="search-error">
                  <p>Ошибка: {searchError}</p>
                  <button className="retry-btn" onClick={searchOnline}>
                    <RefreshCw size={14} />
                    Повторить
                  </button>
                </div>
              ) : onlineResults.length > 0 ? (
                <div className="online-results">
                  <p className="result-count">{onlineResults.length} Найдено файлов INI</p>
                  <div className="ini-list">
                    {onlineResults.map((entry) => (
                      <div key={entry.download_url} className="ini-item online">
                        <div className="ini-info">
                          <span className="ini-name">{entry.name}</span>
                          <span className="ini-source">{entry.source}</span>
                          {entry.size && (
                            <span className="ini-size">
                              {(entry.size / 1024).toFixed(1)} КБ
                            </span>
                          )}
                        </div>
                        <button
                          className="download-btn"
                          onClick={() => handleDownload(entry)}
                          disabled={downloading !== null}
                        >
                          {downloading === entry.download_url ? (
                            <RefreshCw size={14} className="spinning" />
                          ) : (
                            <Download size={14} />
                          )}
                          {downloading === entry.download_url ? "Downloading..." : "Скачать"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="no-online-results">
                  <Wifi size={24} />
                  <p>В интернете не найдено подходящих файлов INI.</p>
                </div>
              )}
            </div>
          )}
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="secondary" onClick={onContinue}>
          Всё равно продолжить
        </Button>
        {selectedIni && !showOnlineSearch && (
          <Button
            variant="primary"
            onClick={handleSelectIni}
            disabled={switching}
            leadingIcon={switching ? <RefreshCw size={14} className="spinning" /> : <Check size={14} />}
          >
            {switching ? "Switching..." : "Использовать выбранный INI"}
          </Button>
        )}
      </Dialog.Footer>
    </Dialog>
  );
}
