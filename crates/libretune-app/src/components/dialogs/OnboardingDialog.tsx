import { useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import {
  Car,
  FolderPlus,
  Table2,
  Bot,
  LineChart,
  Keyboard,
  BookOpen,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react';
import { Dialog, Button } from '../common';
import './OnboardingDialog.css';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  details: React.ReactNode[];
  action?: {
    label: string;
    handler: () => void | Promise<void>;
  };
}

interface OnboardingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function OnboardingDialog({ isOpen, onClose, onComplete }: OnboardingDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [hide, setHide] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Добро пожаловать в LibreTune',
      description: 'Профессиональное ПО для тюнинга ЭБУ',
      icon: Car,
      details: [
        'LibreTune — открытая платформа для тюнинга ЭБУ с поддержкой Speeduino, rusEFI, FOME, epicEFI и MegaSquirt.',
        'Создано на современных технологиях: бэкенд на Rust + фронтенд на React + десктопная платформа Tauri.',
        'Полная навигация с клавиатуры и функции доступности для всех пользователей.',
      ],
    },
    {
      id: 'projects',
      title: 'Создайте свой первый проект',
      description: 'Организуйте свою работу по тюнингу',
      icon: FolderPlus,
      details: [
        '1. Click "File → New Project" or use the welcome screen',
        '2. Select your ECU type (Speeduino, rusEFI, etc.)',
        '3. Choose from built-in templates or start from scratch',
        '4. Connect to your ECU via serial port',
        '5. Load or create a tune file (MSQ format)',
      ],
    },
    {
      id: 'tables',
      title: 'Правка карт топлива и зажигания',
      description: 'Профессиональное редактирование таблиц 2D/3D',
      icon: Table2,
      details: [
        '2D Editor: Click "Tables" to view and edit fuel, ignition, and auxiliary tables',
        'Toolbar: Use =, >, <, *, /, s for Set Equal, Increase, Decrease, Scale, Interpolate, Smooth',
        '3D View: Visualize table values in 3D space with live cursor tracking',
        'След истории: следите за оптимизацией в реальном времени',
        'Копирование/вставка: переносите значения между ячейками клавишами Ctrl+C/Ctrl+V',
      ],
    },
    {
      id: 'autotune',
      title: 'Автонастройка с помощью ИИ',
      description: 'Оптимизация топливной таблицы на основе данных',
      icon: Bot,
      details: [
        '1. Click "Tuning → AutoTune" to start optimization',
        '2. Capture live data from your ECU during driving',
        '3. Review heat maps showing cell weighting and recommended changes',
        '4. Apply recommendations with authority limits',
        '5. Iteratively refine your tune for target AFR',
        'Возможности: блокировка ячеек, настройки фильтра, пределы полномочий, отмена/повтор',
      ],
    },
    {
      id: 'dashboard',
      title: 'Мониторинг в реальном времени',
      description: 'Профессиональная приборная панель',
      icon: LineChart,
      details: [
        'На панели 13 типов приборов: аналоговые шкалы, полосы, развёртки, линейные графики и др.',
        'Щёлкните правой кнопкой для настройки: приборы, цвета, положение',
        'Режим дизайнера: блокировка приборов, привязка к сетке, свободное перемещение',
        'Несколько панелей: заранее настроены раскладки «Базовая», «Гоночная», «Тюнинг»',
        'Темы: автоприменение разных тем одним щелчком',
      ],
    },
    {
      id: 'keyboard',
      title: 'Сочетания клавиш',
      description: 'Рабочий процесс для опытных',
      icon: Keyboard,
      details: [
        'Настраиваемые горячие клавиши: Настройки → Сочетания клавиш',
        'Table editor: Arrow keys navigate, =,>,<,*,/,s operate',
        'Навигация в диалогах: Tab/Shift+Tab — между полями, Escape — закрыть',
        'Конфликты определяются автоматически',
        'Экспорт/импорт схем привязок для командной работы',
      ],
    },
    {
      id: 'resources',
      title: 'Полезные ресурсы',
      description: 'Узнать больше о LibreTune',
      icon: BookOpen,
      details: [
        'Руководство пользователя: «Справка → Руководство» — подробные инструкции',
        'Настройки: Файл → Настройки — параметры, единицы, горячие клавиши',
        'Интеграция с Git: автосохранение работы с контролем версий (Файл → История тюна)',
        'Онлайн-репозитории: автоматическая загрузка INI и файлов тюнов с GitHub',
        'Сообщество: присоединяйтесь к Discord для поддержки и обсуждений',
      ],
      action: {
        label: 'Открыть руководство пользователя',
        handler: async () => {
          try {
            await openUrl('https://libretune.dev/manual/');
          } catch (e) {
            console.error('Failed to open manual:', e);
          }
        },
      },
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const StepIcon = step.icon;
  const titleNode = (
    <div className="onboarding-title">
      <div className="onboarding-icon"><StepIcon size={32} aria-hidden /></div>
      <div className="onboarding-title-text">
        <span className="onboarding-title-main">{step.title}</span>
        <span className="onboarding-title-sub">{step.description}</span>
      </div>
    </div>
  );

  return (
    <Dialog
      open={isOpen}
      onClose={hide ? onComplete : onClose}
      title={titleNode}
      size="md"
      className="onboarding-dialog-wrapper"
    >
      <Dialog.Body className="onboarding-content">
        <ul>
          {step.details.map((detail, idx) => (
            <li key={idx}>{detail}</li>
          ))}
        </ul>

        {step.action && (
          <div className="onboarding-action">
            <Button variant="secondary" onClick={step.action.handler}>
              {step.action.label}
            </Button>
          </div>
        )}

        <label className="onboarding-checkbox">
          <input
            type="checkbox"
            checked={hide}
            onChange={(e) => setHide(e.target.checked)}
          />
          Отключать при каждом запуске
        </label>
      </Dialog.Body>

      <Dialog.Footer className="onboarding-footer">
        <div className="onboarding-progress">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`progress-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
              onClick={() => setCurrentStep(idx)}
              role="button"
              tabIndex={0}
              aria-label={`Go to step ${idx + 1}: ${steps[idx].title}`}
            />
          ))}
        </div>

        <div className="onboarding-controls">
          <Button variant="secondary" onClick={handlePrev} disabled={isFirstStep} leadingIcon={<ChevronLeft size={14} />}>
            Назад
          </Button>
          <Button variant="primary" onClick={handleNext}>
            {isLastStep ? 'Начать' : 'Далее'}
          </Button>
        </div>
      </Dialog.Footer>
    </Dialog>
  );
}
