import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen, FileArchive, Check, AlertTriangle, ArrowRight, Loader } from 'lucide-react';
import { Dialog, Button } from '../common';
import './ImportProjectWizard.css';

interface ImportProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (projectPath: string) => void;
}

interface ImportPreview {
  project_name: string;
  ini_file: Option<string>;
  has_tune: boolean;
  restore_point_count: number;
  has_pc_variables: boolean;
  connection_port: Option<string>;
  connection_baud: Option<number>;
}

type Option<T> = T | null;

export default function ImportProjectWizard({
  isOpen,
  onClose,
  onImportComplete,
}: ImportProjectWizardProps) {
  const [step, setStep] = useState<'select' | 'confirm'>('select');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep('select');
    setSelectedPath(null);
    setPreview(null);
    setLoading(false);
    setImporting(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Выберите папку проекта TS',
      });

      if (selected && typeof selected === 'string') {
        setSelectedPath(selected);
        setLoading(true);
        setError(null);

        // Preview the import
        try {
          const previewData = await invoke<ImportPreview>('preview_tunerstudio_import', {
            path: selected,
          });
          setPreview(previewData);
          setStep('confirm');
        } catch (e) {
          setError(`Not a valid TS project: ${e}`);
          setSelectedPath(null);
        } finally {
          setLoading(false);
        }
      }
    } catch (e) {
      setError(`Failed to open folder picker: ${e}`);
    }
  };

  const handleImport = async () => {
    if (!selectedPath) return;

    setImporting(true);
    setError(null);

    try {
      const projectPath = await invoke<string>('import_tunerstudio_project', {
        sourcePath: selectedPath,
      });

      // Import successful - call the callback which will open the project
      onImportComplete(projectPath);
      handleClose();
    } catch (e) {
      setError(`Import failed: ${e}`);
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  const titleNode = (
    <>
      <FileArchive size={18} />
      Импорт проекта TS
    </>
  );

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      title={titleNode}
      size="md"
      className="import-wizard-dialog"
      closeOnBackdrop={!loading && !importing}
      closeOnEscape={!loading && !importing}
    >
      <Dialog.Body className="import-wizard-content">
          {/* Step indicators */}
          <div className="step-indicators">
            <div className={`step-indicator ${step === 'select' ? 'active' : 'completed'}`}>
              <span className="step-number">1</span>
              <span className="step-label">Выберите папку</span>
            </div>
            <ArrowRight size={16} className="step-arrow" />
            <div className={`step-indicator ${step === 'confirm' ? 'active' : ''}`}>
              <span className="step-number">2</span>
              <span className="step-label">Подтвердить импорт</span>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="import-error">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Select folder */}
          {step === 'select' && (
            <div className="import-step select-step">
              <div className="select-folder-area" onClick={handleSelectFolder}>
                {loading ? (
                  <>
                    <Loader size={32} className="spinner" />
                    <p>Анализ проекта...</p>
                  </>
                ) : (
                  <>
                    <FolderOpen size={48} />
                    <p>Нажмите, чтобы выбрать папку проекта TS</p>
                    <span className="hint">
                      Найдите папку, содержащую <code>project.properties</code>
                    </span>
                  </>
                )}
              </div>
              <div className="import-info">
                <h4>Что импортируется:</h4>
                <ul>
                  <li>Текущий тюн (CurrentTune.msq)</li>
                  <li>Переменные ПК (pcVariableValues.msq)</li>
                  <li>Точки восстановления / резервные копии</li>
                  <li>Параметры подключения</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Confirm */}
          {step === 'confirm' && preview && (
            <div className="import-step confirm-step">
              <div className="preview-card">
                <h3>{preview.project_name}</h3>
                <div className="preview-details">
                  <div className="preview-row">
                    <span className="label">Файл INI:</span>
                    <span className="value">{preview.ini_file || 'Не указано'}</span>
                  </div>
                  <div className="preview-row">
                    <span className="label">Есть тюн:</span>
                    <span className={`value ${preview.has_tune ? 'success' : 'warning'}`}>
                      {preview.has_tune ? <><Check size={14} /> Да</> : 'Нет'}
                    </span>
                  </div>
                  <div className="preview-row">
                    <span className="label">Точки восстановления:</span>
                    <span className="value">{preview.restore_point_count}</span>
                  </div>
                  <div className="preview-row">
                    <span className="label">Переменные ПК:</span>
                    <span className={`value ${preview.has_pc_variables ? 'success' : ''}`}>
                      {preview.has_pc_variables ? <><Check size={14} /> Да</> : 'Нет'}
                    </span>
                  </div>
                  {preview.connection_port && (
                    <div className="preview-row">
                      <span className="label">Последовательный порт:</span>
                      <span className="value">
                        {preview.connection_port}
                        {preview.connection_baud && ` @ ${preview.connection_baud}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="import-note">
                <p>
                  Проект будет импортирован в папку проектов LibreTune и открыт автоматически.
                </p>
              </div>
            </div>
          )}
      </Dialog.Body>

      <Dialog.Footer className="import-wizard-footer">
        {step === 'select' && (
          <Button variant="secondary" onClick={handleClose}>Отмена</Button>
        )}

        {step === 'confirm' && (
          <>
            <Button variant="secondary" onClick={() => setStep('select')} disabled={importing}>
              Назад
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={importing}
              leadingIcon={importing ? <Loader size={14} className="spinner" /> : <FileArchive size={14} />}
            >
              {importing ? 'Importing...' : 'Импорт проекта'}
            </Button>
          </>
        )}
      </Dialog.Footer>
    </Dialog>
  );
}
