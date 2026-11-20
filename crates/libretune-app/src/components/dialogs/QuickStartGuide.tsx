import { useState } from 'react';
import {
  Rocket,
  FolderPlus,
  Settings as SettingsIcon,
  Plug,
  Table2,
  Bot,
  LineChart,
  Save,
  BookOpen,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import { Dialog, Button } from '../common';
import './QuickStartGuide.css';

interface QuickStartStep {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  instructions: string[];
  tips?: string[];
}

interface QuickStartGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * QuickStartGuide Component
 * 
 * Interactive step-by-step guide for new users to:
 * - Create a project
 * - Load or create a tune
 * - Connect to ECU
 * - Explore key features
 */
export default function QuickStartGuide({ isOpen, onClose }: QuickStartGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: QuickStartStep[] = [
    {
      id: 'welcome',
      title: 'Добро пожаловать в LibreTune',
      description: 'Краткое руководство',
      icon: Rocket,
      instructions: [
        'Это руководство проведёт вас по основным шагам для начала работы.',
        'Вы узнаете, как создать проект, загрузить тюн и подключиться к ЭБУ.',
        'Каждый шаг содержит подсказки и пояснения, которые помогут понять LibreTune.',
      ],
    },
    {
      id: 'create-project',
      title: 'Шаг 1: создайте проект',
      description: 'Организуйте свою работу по тюнингу',
      icon: FolderPlus,
      instructions: [
        '1. Click "File → New Project" (or press Ctrl+N)',
        '2. Give your project a descriptive name (e.g., "My 4-Cyl NA Speeduino")',
        '3. Select your ECU type from the list:',
        '   • Speeduino: Arduino-based open-source ECU',
        '   • rusEFI: Professional STM32-based tuning platform',
        '   • FOME: Enhanced rusEFI variant',
        '   • epicEFI: rusEFI variant for epicECU boards',
        '   • MegaSquirt: MS2/MS3 systems',
        '4. Choose a template or start from scratch',
        '5. Click "Create Project"',
      ],
      tips: [
        'Шаблоны содержат готовые настройки для типовых двигателей',
        'У каждого типа ЭБУ свои меню и возможности',
      ],
    },
    {
      id: 'load-tune',
      title: 'Шаг 2: загрузите или создайте тюн',
      description: 'Настройте конфигурацию вашего ЭБУ',
      icon: SettingsIcon,
      instructions: [
        'У вас три варианта:',
        'Вариант A: начать с нового пустого тюна',
        '   • File → New Tune (creates default values)',
        'Вариант B: импортировать существующий тюн',
        '   • File → Open Tune and select .xml or .msq file',
        '   • LibreTune automatically detects and parses the format',
        'Вариант C: загрузить прямо из ЭБУ',
        '   • Connect to ECU first (see Step 3)',
        '   • Click "Tools → Load from ECU"',
      ],
      tips: [
        'Тюны сохраняются в формате MSQ (совместим с TunerStudio)',
        'Тюны можно экспортировать в CSV для анализа',
      ],
    },
    {
      id: 'connect-ecu',
      title: 'Шаг 3: подключитесь к ЭБУ',
      description: 'Установить последовательную связь',
      icon: Plug,
      instructions: [
        '1. Connect your ECU to your computer via USB',
        '2. Click "Connect" button or File → Connect to ECU',
        '3. Select the serial port (usually /dev/ttyACM0 or COM3+)',
        '4. Confirm the baud rate (9600-115200, varies by ECU)',
        '5. Click "Connect" to establish communication',
        '6. LibreTune will automatically sync with your ECU',
      ],
      tips: [
        'Строка состояния показывает состояние подключения (Подключено/Отключено)',
        'Если подключение не удаётся, проверьте установку драйвера и выбор порта',
        'Демо-режим доступен: Файл → Настройки → Включить демо-режим',
      ],
    },
    {
      id: 'explore-tables',
      title: 'Шаг 4: изучите карты топлива и зажигания',
      description: 'Понимание таблиц VE и зажигания',
      icon: Table2,
      instructions: [
        '1. Click "Tables" in the sidebar',
        '2. Select a table from the menu (e.g., "Fuel → VE Table")',
        '3. The 2D table editor opens showing fuel values (VE)',
        '   • Rows: Engine RPM',
        '   • Columns: Engine Load (MAP, TPS, Airflow)',
        '   • Values: Fuel amount (percentage)',
        '4. Click on any cell to edit its value',
        '5. Use toolbar buttons:',
        '   • = (Set Equal) - Set selected cells to average',
        '   • > (Increase) - Add percentage to selected cells',
        '   • < (Decrease) - Subtract percentage',
        '   • * (Scale) - Multiply all values',
        '   • / (Interpolate) - Smooth between corners',
        '   • s (Smooth) - Weighted average filter',
      ],
      tips: [
        'Щёлкните правой кнопкой для дополнительных параметров и расширенных операций',
        'Ctrl+Z — отмена, Ctrl+Y — повтор изменений',
        'Для лучшей наглядности используйте 3D-вид: Вид → 3D-таблица',
      ],
    },
    {
      id: 'autotune',
      title: 'Шаг 5: автонастройка таблиц',
      description: 'Оптимизация на основе данных',
      icon: Bot,
      instructions: [
        '1. Click "Tuning → AutoTune"',
        '2. Configure AutoTune settings:',
        '   • Select target table (usually VE table)',
        '   • Set target AFR (e.g., 14.7 for gasoline)',
        '   • Set authority limits (max change per cell)',
        '   • Configure filters (cell locks, TPS rate, etc.)',
        '3. Go for a test drive and capture data',
        '4. Review heat maps showing:',
        '   • Cell Weighting: How much data each cell got',
        '   • Cell Change: Magnitude of recommended changes',
        '5. Apply recommendations with "Send to Table"',
        '6. Iterate: Drive → Tune → Repeat for refinement',
      ],
      tips: [
        'Начните с пределов полномочий ±2–5% за цикл',
        'Блокировать ячейки с недостаточными данными',
        'Несколько поездок улучшают результат',
      ],
    },
    {
      id: 'dashboard',
      title: 'Шаг 6: мониторинг на приборной панели',
      description: 'Визуализация данных в реальном времени',
      icon: LineChart,
      instructions: [
        '1. Click "Dashboard" tab at the bottom',
        '2. View gauges showing live ECU data:',
        '   • RPM, AFR, Coolant temp, Intake air temp',
        '   • TPS, MAP, Battery voltage, etc.',
        '3. Customize the dashboard:',
        '   • Right-click on any gauge',
        '   • Change values, colors, or positions',
        '   • Enable Designer Mode for free movement',
        '4. Create multiple dashboards:',
        '   • Tools → New Dashboard',
        '   • Choose from templates (Basic, Racing, Tuning)',
        '5. Switch between dashboards using the dropdown',
      ],
      tips: [
        '13 different gauge types available',
        'Переключите режим дизайнера, чтобы заблокировать/разблокировать положение приборов',
        'Щёлкните правой кнопкой на фоне для параметров раскладки',
      ],
    },
    {
      id: 'save-burn',
      title: 'Шаг 7: сохранение и прошивка в ЭБУ',
      description: 'Сохраните свои изменения',
      icon: Save,
      instructions: [
        '1. Save your tune locally:',
        '   • File → Save Tune (or Ctrl+S)',
        '   • Choose a filename and location',
        '2. Burn to ECU:',
        '   • File → Burn to ECU (or Alt+B)',
        '   • Confirm burning to avoid accidental overwrites',
        '   • Watch progress bar during write',
        '3. Create backups:',
        '   • File → Restore Points → Create Restore Point',
        '   • Saves timestamped backup of your tune',
        '4. Version control (Git):',
        '   • File → Tune History to view all changes',
        '   • Automatic or manual commits (configurable)',
      ],
      tips: [
        'Всегда делайте резервную копию перед экспериментами',
        'Храните несколько точек восстановления на разных этапах',
        'Используйте содержательные сообщения коммитов',
      ],
    },
    {
      id: 'next-steps',
      title: 'Что дальше?',
      description: 'Продолжить обучение',
      icon: BookOpen,
      instructions: [
        'Поздравляем! Теперь вы знаете основной порядок работы.',
        'Чтобы углубить знания:',
        '1. Read the comprehensive User Manual (Help → Manual)',
        '2. Explore advanced features:',
        '   • Diagnostic loggers (tooth logger, composite logger)',
        '   • Table comparison tools',
        '   • Performance calculator',
        '   • Custom keyboard shortcuts',
        '   • Light/dark themes and accessibility options',
        '3. Practice with demo mode before your first live tune',
        '4. Join the community: Discord/Forum for support',
      ],
      tips: [
        'В руководстве пользователя есть подробные уроки со скриншотами',
        'Начните с демо-режима, чтобы освоиться с интерфейсом',
        'Для живых данных рассмотрите тестовый автомобиль или прогон на стенде',
      ],
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
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
  const progress = ((currentStep + 1) / steps.length) * 100;

  const StepIcon = step.icon;
  const titleNode = (
    <div className="qs-title-row">
      <div className="quick-start-icon"><StepIcon size={28} aria-hidden /></div>
      <div className="quick-start-title-block">
        <span className="qs-title-main">{step.title}</span>
        <span className="qs-title-sub">{step.description}</span>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onClose={onClose} title={titleNode} size="md" className="quick-start-dialog-wrapper">
      <div className="quick-start-progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <Dialog.Body className="quick-start-content">
        <div className="instructions-section">
          <h3>Инструкции</h3>
          <ol className="instructions-list">
            {step.instructions.map((instruction, idx) => (
              <li key={idx}>{instruction}</li>
            ))}
          </ol>
        </div>

        {step.tips && step.tips.length > 0 && (
          <div className="tips-section">
            <h4><Lightbulb size={14} aria-hidden /> Советы</h4>
            <ul className="tips-list">
              {step.tips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </Dialog.Body>

      <Dialog.Footer className="quick-start-footer">
        <div className="step-indicator">
          Шаг {currentStep + 1} of {steps.length}
        </div>

        <div className="quick-start-controls">
          <Button variant="secondary" onClick={handlePrev} disabled={isFirstStep}>
            Назад
          </Button>
          <Button variant="primary" onClick={handleNext}>
            {isLastStep ? 'Готово' : 'Далее'}
          </Button>
        </div>
      </Dialog.Footer>
    </Dialog>
  );
}
