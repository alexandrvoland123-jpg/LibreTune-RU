# Участие в разработке

Спасибо за интерес к участию в разработке LibreTune!

## Начало работы

### Необходимые компоненты

- [Rust](https://rustup.rs/) (стабильная версия toolchain)
- [Node.js](https://nodejs.org/) версии 20 или новее (требуется Vite 7) и npm
- [Tauri CLI](https://tauri.app/start/prerequisites/)

### Клонирование репозитория

```bash
git clone https://github.com/RallyPat/LibreTune.git
cd LibreTune
```

### Установка зависимостей

```bash
# Зависимости frontend
cd crates/libretune-app
npm install

# Возврат в корневую папку
cd ../..
```

### Режим разработки

```bash
cd crates/libretune-app
npm run tauri dev
```

Команда запускает приложение в режиме разработки с автоматической горячей перезагрузкой.

## Структура проекта

```
LibreTune/
├── crates/
│   ├── libretune-core/     # Основная библиотека Rust
│   │   ├── src/
│   │   │   ├── ini/        # Разбор INI
│   │   │   ├── protocol/   # Обмен данными с ЭБУ
│   │   │   ├── project/    # Управление проектами
│   │   │   └── ...
│   │   └── tests/
│   └── libretune-app/      # Настольное приложение Tauri
│       ├── src/            # Frontend на React
│       └── src-tauri/      # Backend Tauri
├── docs/                   # Документация
└── scripts/                # Скрипты сборки
```

## Правила разработки

### Стиль кода

**Rust:**
- Перед отправкой изменений выполняйте `cargo fmt`.
- Запускайте `cargo clippy` и исправляйте предупреждения.
- Добавляйте документационные комментарии (`///`) для публичных элементов.

**TypeScript:**
- Используйте строгий режим TypeScript.
- Добавляйте комментарии JSDoc для компонентов.
- Следуйте рекомендациям по разработке на React.

### Тестирование

```bash
# Тесты Rust
cargo test -p libretune-core

# Проверка типов TypeScript
cd crates/libretune-app
npm run typecheck
```

### Документация

- Обновляйте AGENTS.md при изменениях реализации.
- Добавляйте JSDoc/rustdoc для новых API.
- Обновляйте руководство пользователя при добавлении функций, видимых пользователю.

## Отправка изменений

1. Создайте fork репозитория.
2. Создайте отдельную ветку для функции: `git checkout -b feature/my-feature`.
3. Внесите изменения.
4. Запустите тесты: `cargo test && npm run typecheck`.
5. Создайте коммит с понятным описанием.
6. Отправьте изменения в свой fork.
7. Создайте Pull Request.

### Сообщения коммитов

Используйте понятные и информативные сообщения коммитов:

```
feat: Add wideband O2 support for rusEFI

- Parse lambda sensor configuration from INI
- Add lambda-to-AFR conversion
- Update dashboard to show lambda/AFR toggle
```

## Направления для участия

В [GitHub Issues](https://github.com/RallyPat/LibreTune/issues) можно найти задачи с метками:
- `good first issue` — подходящие задачи для начинающих.
- `help wanted` — задачи, для которых нужна помощь сообщества.
- `enhancement` — предложения по новым функциям.
- `bug` — ошибки, требующие исправления.

## Лицензия

Участвуя в разработке, вы соглашаетесь с тем, что ваши изменения будут распространяться по лицензии GPL-2.0.
