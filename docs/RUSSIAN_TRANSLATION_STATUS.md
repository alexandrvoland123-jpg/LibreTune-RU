# Состояние русской локализации

В текущем архиве переведены или частично локализованы 33 из 59 страниц `docs/src`. В этой итерации дополнительно полностью переведены:

- `src/introduction.md`;
- `src/getting-started/installation.md`;
- `src/faq.md`;
- `src/features/dashboards.md`;
- `src/features/table-editing.md`.

В пользовательских сообщениях Rust (`src-tauri` и `libretune-core`) сохранены исходные имена типов, вариантов перечислений, функций и других программных идентификаторов. Перевод затрагивает только текст сообщений и комментарии. Заголовок главного окна уже русифицирован в `tauri.conf.json`.

## Проверки

- YAML-файлы GitHub Actions разобраны без синтаксических ошибок.
- Локальные действия, вызываемые из `.github/workflows/ci.yml`, существуют.
- JSON-конфигурации (кроме `tsconfig.json`, который использует JSONC) и TOML-файлы прошли проверку разбора.
- Сравнение токенов Rust с исходным архивом не выявило изменений программных идентификаторов или структуры кода: изменены только текстовые литералы и комментарии.
- Скрипт `npm run check:tauri-sync` выполнен успешно: версии Tauri Rust crates и npm-пакетов совпадают.

Полный CI не запускался: в рабочей среде отсутствуют Rust/Cargo и rustfmt; `npm ci --offline` остановился из-за отсутствующего в локальном кэше пакета `zustand`. Поэтому компиляция Rust, `cargo fmt --check`, тесты и frontend build не подтверждены.

## Осталось перевести

- `src/changelog.md`;
- `src/contributing.md`;
- `src/features/ai-assistant.md`;
- `src/features/autotune/usage-guide.md`;
- `src/features/base-map.md`;
- `src/features/data-statistics.md`;
- `src/features/diagnostic-loggers.md`;
- `src/features/mcp-server.md`;
- `src/features/performance-calculator.md`;
- `src/features/smart-recording.md`;
- `src/features/tools.md`;
- `src/features/tune-migration.md`;
- `src/getting-started/settings.md`;
- `src/reference/action-scripting.md`;
- `src/reference/ini-format.md`;
- `src/reference/java-to-wasm-migration.md`;
- `src/reference/troubleshooting.md`;
- `src/technical/ai-assistant.md`;
- `src/technical/autotune-algorithm.md`;
- `src/technical/ecu-protocol.md`;
- `src/technical/ini-parser.md`;
- `src/technical/lua-scripting.md`;
- `src/technical/plugin-system.md`;
- `src/technical/port-editor.md`;
- `src/technical/table-operations.md`;
- `src/technical/version-control.md`.
