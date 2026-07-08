export type BlockedReason =
  | 'unauthenticated'
  | 'auth_loading'
  | 'profile_unresolved'
  | 'demo_user';

export interface OperationalAuthorityInput {
  user: { id: string } | null | undefined;
  authLoading: boolean;
  profile: { is_demo: boolean } | null | undefined;
}

export interface OperationalAuthorityState {
  canUseOperationalData: boolean;
  blockedReason: BlockedReason | null;
}

export type OperationalToastCallback = (args: {
  title: string;
  description: string;
  variant?: string;
}) => void;

export interface RequireOperationalProfileOptions extends OperationalAuthorityInput {
  toast?: OperationalToastCallback;
}

const BLOCKED_MESSAGES: Record<BlockedReason, { title: string; description: string }> = {
  unauthenticated: {
    title: 'Sign in required',
    description: 'Please sign in to perform this action.',
  },
  auth_loading: {
    title: 'Account is still loading',
    description: 'Please wait until your account is fully loaded before continuing.',
  },
  profile_unresolved: {
    title: 'Account is still loading',
    description: 'Please wait until your account is fully loaded before continuing.',
  },
  demo_user: {
    title: "Demo accounts can't submit real requests",
    description: 'This is a demo account. Real operational actions are not available from demo sessions.',
  },
};

// Default state is always blocked; a nullable/unresolved profile must never be treated as non-demo.
export function getOperationalAuthority(input: OperationalAuthorityInput): OperationalAuthorityState {
  const { user, authLoading, profile } = input;

  if (!user) {
    return { canUseOperationalData: false, blockedReason: 'unauthenticated' };
  }
  if (authLoading) {
    return { canUseOperationalData: false, blockedReason: 'auth_loading' };
  }
  if (!profile) {
    return { canUseOperationalData: false, blockedReason: 'profile_unresolved' };
  }
  if (profile.is_demo) {
    return { canUseOperationalData: false, blockedReason: 'demo_user' };
  }
  return { canUseOperationalData: true, blockedReason: null };
}

export function requireOperationalProfile(options: RequireOperationalProfileOptions): boolean {
  const { toast, ...authorityInput } = options;
  const { canUseOperationalData, blockedReason } = getOperationalAuthority(authorityInput);

  if (!canUseOperationalData && blockedReason && toast) {
    const message = BLOCKED_MESSAGES[blockedReason];
    toast({ title: message.title, description: message.description, variant: 'destructive' });
  }

  return canUseOperationalData;
}
