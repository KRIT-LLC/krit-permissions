# krit-permissions

Общий React-пакет для отображения интерфейса в зависимости от полномочий пользователя: контекст, провайдер, хуки и декларативные «ворота» для элементов UI. Сами коды полномочий и вызовы API приложение задаёт снаружи — пакет не привязан к DTO бэкенда.

## Подключение как git submodule

Рекомендуемый способ — отдельный submodule в каталоге `packages/krit-permissions`, аналогично [krit-ui](https://github.com/KRIT-LLC/krit-ui).

### Первичная установка в репозитории приложения

```bash
git submodule add https://github.com/KRIT-LLC/krit-permissions.git packages/krit-permissions
git commit -m "chore: add krit-permissions submodule"
```

В `package.json` зависимость на локальный пакет:

```json
"krit-permissions": "file:packages/krit-permissions"
```

(в отдельных проектах путь может быть `file:./packages/krit-permissions`.)

После клонирования основного репозитория:

```bash
git submodule update --init --recursive
```

либо при первом клоне:

```bash
git clone --recurse-submodules <url-вашего-приложения>
```

### CI и сборка

Убедитесь, что submodule подтягивается до `npm ci` / `npm install`, иначе каталог `packages/krit-permissions` окажется пустым и сборка упадёт.

### Обновление указателя submodule в приложении

```bash
cd packages/krit-permissions
git fetch origin
git checkout main   # или нужный тег/коммит
git pull
cd ../..
git add packages/krit-permissions
git commit -m "chore: bump krit-permissions submodule"
```

### Версионирование (сопровождение репозитория пакета)

Из корня **этого** репозитория (`krit-permissions`) — один скрипт [scripts/bump-version.sh](scripts/bump-version.sh):

```bash
./scripts/bump-version.sh [patch|minor|major] [--git]
# или
npm run version:bump -- patch
npm run version:bump -- minor --git
```

По умолчанию уровень — `patch`. Флаг `--git` после bump делает commit с `package.json` и аннотированный тег `vX.Y.Z`. Отправка: `git push origin main && git push origin v$(node -p "require('./package.json').version")`.

## Установка зависимостей

В корне приложения после добавления submodule:

```bash
npm install
```

Требуется **React 18** (peer dependency).

## Кратко по API

- **`PermissionProvider`** — передаёт набор кодов полномочий (`permissionCodes`), опционально «сырой» ответ API (`permissionsRaw`) и словарь подписей (`translations`).
- **`usePermissions`**, **`useHasPermission(code)`** — чтение текущего набора и проверка кода.
- **`PermissionGate`** — обёртка с `anyOf` / `allOf` для условного рендера дочерних элементов.
- **`AccessDenied`** — простой блок сообщения об отсутствии доступа.
- **`usePermissionTranslation(code)`** — подпись по коду из `translations` провайдера.

Импорт:

```ts
import {
  PermissionProvider,
  PermissionGate,
  useHasPermission,
  usePermissions,
} from 'krit-permissions';
```

## Репозиторий

Исходный код: [github.com/KRIT-LLC/krit-permissions](https://github.com/KRIT-LLC/krit-permissions).
