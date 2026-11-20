import { useState } from "react";
import { Check, FolderPlus, Download, X } from "lucide-react";
import "./WelcomeView.css";

interface ProjectInfo {
  name: string;
  path: string;
  signature: string;
  modified: string;
}

interface WelcomeViewProps {
  projects: ProjectInfo[];
  onOpenProject: (path: string) => void;
  onNewProject: () => void;
  onImportTsProject: () => void;
  onDeleteProject: (name: string) => void;
}

export default function WelcomeView({
  projects,
  onOpenProject,
  onNewProject,
  onImportTsProject,
  onDeleteProject,
}: WelcomeViewProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function handleDelete(e: React.MouseEvent, projectName: string) {
    e.stopPropagation();
    if (confirmDelete === projectName) {
      onDeleteProject(projectName);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(projectName);
    }
  }

  return (
    <div className="welcome-view">
      <div className="welcome-header">
        <h1 className="welcome-title">LibreTune</h1>
        <p className="welcome-subtitle">Открытое ПО для тюнинга ЭБУ</p>
      </div>

      <div className="welcome-actions">
        <button className="welcome-action-btn primary" onClick={onNewProject}>
          <span className="action-icon"><FolderPlus size={32} /></span>
          <span className="action-label">Подключить ЭБУ / Новый проект</span>
          <span className="action-desc">Определить подключённый ЭБУ или начать офлайн</span>
        </button>
        <button className="welcome-action-btn" onClick={onImportTsProject}>
          <span className="action-icon"><Download size={32} /></span>
          <span className="action-label">Импорт проекта TS</span>
          <span className="action-desc">Импорт из TunerStudio</span>
        </button>
      </div>

      {projects.length > 0 && (
        <div className="welcome-recent">
          <h3 className="recent-title">Недавние проекты</h3>
          <div className="recent-list">
            {projects.slice(0, 8).map((project) => (
              <div
                key={project.path}
                className="recent-item"
                onClick={() => onOpenProject(project.path)}
              >
                <div className="recent-info">
                  <div className="recent-name">{project.name}</div>
                  <div className="recent-sig">{project.signature}</div>
                  <div className="recent-date">
                    Последнее изменение: {new Date(project.modified).toLocaleDateString()}
                  </div>
                </div>
                <button
                  className={`recent-delete ${confirmDelete === project.name ? "confirm" : ""}`}
                  onClick={(e) => handleDelete(e, project.name)}
                  title={confirmDelete === project.name ? "Нажмите ещё раз для подтверждения" : "Удалить проект"}
                >
                  {confirmDelete === project.name ? (
                    <><Check size={14} /> Подтвердить</>
                  ) : (
                    <X size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
