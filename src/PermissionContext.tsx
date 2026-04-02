import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type PermissionTranslations = Record<string, string>;

export type PermissionContextValue = {
  permissionCodes: ReadonlySet<string>;
  permissionsRaw?: unknown;
  translations?: PermissionTranslations;
};

const PermissionContext = createContext<PermissionContextValue | null>(null);

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
  /** Сырой ответ API для потребителей (без типизации DTO в пакете). */
  permissionsRaw?: unknown;
  translations?: PermissionTranslations;
  fallback?: ReactNode;
};

export function PermissionProvider({
  children,
  permissionCodes: permissionCodesProp,
  fetchPermissionCodes,
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

  const value = useMemo(
    () => ({ permissionCodes, permissionsRaw, translations }),
    [permissionCodes, permissionsRaw, translations],
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
  const { permissionCodes } = usePermissions();
  return permissionCodes.has(code);
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
  const { permissionCodes } = usePermissions();

  let allowed = true;
  if (allOf?.length) {
    allowed = allOf.every((c) => permissionCodes.has(c));
  }
  if (allowed && anyOf?.length) {
    allowed = anyOf.some((c) => permissionCodes.has(c));
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
