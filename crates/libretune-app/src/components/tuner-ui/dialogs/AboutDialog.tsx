import { useState, useEffect } from 'react';
import { Wrench } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Dialog, Button } from '../../common';
import { DialogProps, BuildInfo } from './types';
import { UpdateSection } from './UpdateSection';
import '../Dialogs.css';

export function AboutDialog({ isOpen, onClose }: DialogProps) {
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    invoke<BuildInfo>('get_build_info')
      .then(setBuildInfo)
      .catch(() => setBuildInfo(null));
  }, [isOpen]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="О программе LibreTune"
      size="sm"
    >
      <Dialog.Body className="dialog-about">
        <div className="dialog-about-logo"><Wrench size={48} /></div>
        <h3>LibreTune</h3>
        <p className="dialog-version">
          Версия {buildInfo?.version ?? 'unknown'}
        </p>
        <p className="dialog-build">
          Сборка {buildInfo?.build_id ?? 'unknown'}
        </p>

        <UpdateSection />

        <p>Открытое ПО для тюнинга ЭБУ, совместимое со стандартными файлами определений INI.</p>

        <div className="dialog-about-links">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); openUrl('https://github.com/RallyPat/LibreTune'); }}
          >
            GitHub
          </a>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); openUrl('https://github.com/RallyPat/LibreTune/tree/main/docs'); }}
          >
            Документация
          </a>
        </div>

        <p className="dialog-license">
          Лицензия GPL-2.0
        </p>
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="secondary" onClick={onClose}>Закрыть</Button>
      </Dialog.Footer>
    </Dialog>
  );
}
