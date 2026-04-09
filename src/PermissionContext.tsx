import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type PermissionTranslations = Record<string, string>;

export type PermissionContextValue = {
  permissionCodes: ReadonlySet<string>;
  /**
   * Код полномочия «все функции продукта» (суперпользователь).
   * Задаётся приложением (например из OpenAPI enum). Если не передан в провайдер — «полный доступ» не учитывается.
   */
  allFunctionsPermissionCode?: string;
  permissionsRaw?: unknown;
  translations?: PermissionTranslations;
};

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function hasPermission(
  permissionCodes: ReadonlySet<string>,
  code: string,
  allFunctionsPermissionCode?: string | null,
): boolean {
  if (
    allFunctionsPermissionCode != null &&
    allFunctionsPermissionCode !== '' &&
    permissionCodes.has(allFunctionsPermissionCode)
  ) {
    return true;
  }
  return permissionCodes.has(code);
}

function toSet(codes: Iterable<string> | null | undefined): Set<string> {
  if (codes == null) return new Set<string>();
  return new Set<string>(codes);
}

export type PermissionProviderProps = {
  children: ReactNode;
  /** Уже известные коды полномочий (например с хоста или после запроса). */
  permissionCodes?: Iterable<string> | null;
  /** Асинхронная подгрузка кодов, если не передан permissionCodes. */
  fetchPermissionCodes?: () => Promise<Iterable<string>>;
  /**
   * Код полномочия полного доступа к функциям продукта (например значение enum из контракта API).
   * Задаётся только приложением, не внутри пакета.
   */
  allFunctionsPermissionCode?: string | null;
  /** Сырой ответ API для потребителей (без типизации DTO в пакете). */
  permissionsRaw?: unknown;
  translations?: PermissionTranslations;
  fallback?: ReactNode;
};

export function PermissionProvider({
  children,
  permissionCodes: permissionCodesProp,
  fetchPermissionCodes,
  allFunctionsPermissionCode: allFunctionsPermissionCodeProp,
  permissionsRaw,
  translations,
  fallback = null,
}: PermissionProviderProps) {
  const [fetched, setFetched] = useState<Set<string> | null>(null);
  const needsFetch = Boolean(fetchPermissionCodes) && permissionCodesProp == null;
  const [loading, setLoading] = useState(needsFetch);

  useEffect(() => {
    if (!fetchPermissionCodes || permissionCodesProp != null) return;
    let cancelled = false;
    setLoading(true);
    void fetchPermissionCodes()
      .then((c) => {
        if (!cancelled) setFetched(toSet(c));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPermissionCodes, permissionCodesProp]);

  const permissionCodes = useMemo(() => {
    if (permissionCodesProp != null) {
      return toSet(permissionCodesProp);
    }
    return fetched ?? new Set<string>();
  }, [permissionCodesProp, fetched]);

  const allFunctionsPermissionCode =
    allFunctionsPermissionCodeProp == null || allFunctionsPermissionCodeProp === ''
      ? undefined
      : allFunctionsPermissionCodeProp;

  const value = useMemo(
    () => ({
      permissionCodes,
      allFunctionsPermissionCode,
      permissionsRaw,
      translations,
    }),
    [permissionCodes, allFunctionsPermissionCode, permissionsRaw, translations],
  );

  if (loading) return <>{fallback}</>;
  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return ctx;
}

export function useHasPermission(code: string): boolean {
  const { permissionCodes, allFunctionsPermissionCode } = usePermissions();
  return hasPermission(permissionCodes, code, allFunctionsPermissionCode);
}

export type PermissionGateProps = {
  children: ReactNode;
  /** Достаточно любого из перечисленных кодов. */
  anyOf?: string[];
  /** Требуются все перечисленные коды. */
  allOf?: string[];
  fallback?: ReactNode;
};

export function PermissionGate({ anyOf, allOf, children, fallback = null }: PermissionGateProps) {
  const { permissionCodes, allFunctionsPermissionCode } = usePermissions();

  let allowed = true;
  if (allOf?.length) {
    allowed = allOf.every((c) => hasPermission(permissionCodes, c, allFunctionsPermissionCode));
  }
  if (allowed && anyOf?.length) {
    allowed = anyOf.some((c) => hasPermission(permissionCodes, c, allFunctionsPermissionCode));
  }
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}

export type AccessDeniedProps = {
  title?: string;
  message?: string;
  className?: string;
};

export function AccessDenied({ title, message, className }: AccessDeniedProps) {
  return (
    <div className={className} role='alert'>
      {title ? <h2 className='text-lg font-semibold mb-2'>{title}</h2> : null}
      {message ? <p>{message}</p> : null}
    </div>
  );
}

export function usePermissionTranslation(code: string): string | undefined {
  const { translations } = usePermissions();
  return translations?.[code];
}
