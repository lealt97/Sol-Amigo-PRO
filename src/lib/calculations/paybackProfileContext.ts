export type ActivePaybackProfiles = {
  monthlyCompensableConsumptionProfileKwh: number[] | null;
  monthlyGenerationProfileKwh: number[] | null;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type PaybackScopeInput = {
  userId?: string | null;
  pathname: string;
  search?: string;
};

export const PAYBACK_LEGACY_STORAGE_KEY = 'sol-amigo:payback:pricing-v3';
export const PAYBACK_SCOPED_STORAGE_PREFIX = 'sol-amigo:payback:pricing-v4';

const EMPTY_PROFILES: ActivePaybackProfiles = {
  monthlyCompensableConsumptionProfileKwh: null,
  monthlyGenerationProfileKwh: null,
};

const profilesByScope = new Map<string, ActivePaybackProfiles>();
let activeStorageScope: string | null = null;
let lifecycleListenerInstalled = false;

const cloneProfiles = (profiles: ActivePaybackProfiles): ActivePaybackProfiles => ({
  monthlyCompensableConsumptionProfileKwh: profiles.monthlyCompensableConsumptionProfileKwh
    ? [...profiles.monthlyCompensableConsumptionProfileKwh]
    : null,
  monthlyGenerationProfileKwh: profiles.monthlyGenerationProfileKwh
    ? [...profiles.monthlyGenerationProfileKwh]
    : null,
});

const decodeJwtSubject = (token: string) => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
    const parsed = JSON.parse(decoded) as { sub?: unknown };
    return typeof parsed.sub === 'string' && parsed.sub.trim() ? parsed.sub : null;
  } catch {
    return null;
  }
};

const extractUserId = (value: string | null) => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as {
      user?: { id?: unknown };
      session?: { user?: { id?: unknown }; access_token?: unknown };
      currentSession?: { user?: { id?: unknown }; access_token?: unknown };
      access_token?: unknown;
    };
    const candidates = [
      parsed.user?.id,
      parsed.session?.user?.id,
      parsed.currentSession?.user?.id,
    ];
    const directId = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim());
    if (typeof directId === 'string') return directId;

    const tokenCandidates = [
      parsed.access_token,
      parsed.session?.access_token,
      parsed.currentSession?.access_token,
    ];
    const accessToken = tokenCandidates.find((candidate) => typeof candidate === 'string');
    return typeof accessToken === 'string' ? decodeJwtSubject(accessToken) : null;
  } catch {
    return null;
  }
};

const readSupabaseUserId = () => {
  if (typeof window === 'undefined') return null;
  const storages: StorageLike[] = [window.localStorage, window.sessionStorage];
  for (const storage of storages) {
    const fullStorage = storage as Storage;
    for (let index = 0; index < fullStorage.length; index += 1) {
      const key = fullStorage.key(index);
      if (!key || !key.includes('auth-token')) continue;
      const userId = extractUserId(storage.getItem(key));
      if (userId) return userId;
    }
  }
  return null;
};

export function buildPaybackScope({ userId, pathname, search = '' }: PaybackScopeInput) {
  const normalizedUserId = userId?.trim() || 'anonymous';
  const normalizedPathname = pathname.trim() || '/';
  return `${normalizedUserId}:${normalizedPathname}${search}`;
}

export function buildPaybackStorageKey(scope: string) {
  return `${PAYBACK_SCOPED_STORAGE_PREFIX}:${encodeURIComponent(scope)}`;
}

export function flushPaybackStorageScope(storage: StorageLike, scope: string | null) {
  if (!scope) return;
  const scopedKey = buildPaybackStorageKey(scope);
  const currentForm = storage.getItem(PAYBACK_LEGACY_STORAGE_KEY);
  if (currentForm == null) {
    storage.removeItem(scopedKey);
  } else {
    storage.setItem(scopedKey, currentForm);
  }
}

export function switchPaybackStorageScope(
  storage: StorageLike,
  previousScope: string | null,
  nextScope: string,
) {
  if (previousScope === nextScope) return nextScope;

  if (previousScope) {
    flushPaybackStorageScope(storage, previousScope);
  } else {
    // A chave antiga não identificava usuário nem proposta. Não é seguro atribuí-la
    // automaticamente ao primeiro rascunho aberto após esta correção.
    storage.removeItem(PAYBACK_LEGACY_STORAGE_KEY);
  }

  const nextForm = storage.getItem(buildPaybackStorageKey(nextScope));
  if (nextForm == null) {
    storage.removeItem(PAYBACK_LEGACY_STORAGE_KEY);
  } else {
    storage.setItem(PAYBACK_LEGACY_STORAGE_KEY, nextForm);
  }
  return nextScope;
}

export function setPaybackProfilesForScope(scope: string, profiles: ActivePaybackProfiles) {
  profilesByScope.set(scope, cloneProfiles(profiles));
}

export function getPaybackProfilesForScope(scope: string): ActivePaybackProfiles {
  return cloneProfiles(profilesByScope.get(scope) ?? EMPTY_PROFILES);
}

const resolveCurrentScope = () => {
  if (typeof window === 'undefined') return 'server:/';
  return buildPaybackScope({
    userId: readSupabaseUserId(),
    pathname: window.location.pathname,
    search: window.location.search,
  });
};

const activateCurrentScope = () => {
  const scope = resolveCurrentScope();
  if (typeof window !== 'undefined') {
    activeStorageScope = switchPaybackStorageScope(
      window.sessionStorage,
      activeStorageScope,
      scope,
    );

    if (!lifecycleListenerInstalled) {
      lifecycleListenerInstalled = true;
      window.addEventListener('pagehide', () => {
        flushPaybackStorageScope(window.sessionStorage, activeStorageScope);
      });
    }
  }
  return scope;
};

export function setActivePaybackProfiles(profiles: ActivePaybackProfiles) {
  setPaybackProfilesForScope(activateCurrentScope(), profiles);
}

export function getActivePaybackProfiles(): ActivePaybackProfiles {
  return getPaybackProfilesForScope(activateCurrentScope());
}
