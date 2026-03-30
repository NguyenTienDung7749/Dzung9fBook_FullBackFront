import { isApiProviderMode } from '../config/runtime.js';
import { apiAuthProvider } from '../providers/auth/api.js';
import { staticAuthProvider } from '../providers/auth/static.js';
import { setSessionLoading, setSessionUser } from '../state/session-store.js';

const getAuthProvider = function () {
  return isApiProviderMode() ? apiAuthProvider : staticAuthProvider;
};

const applySessionState = function (payload) {
  const user = payload?.authenticated ? payload.user || null : null;
  setSessionUser(user);
  return {
    authenticated: Boolean(user),
    user
  };
};

export const getSession = async function () {
  return applySessionState(await getAuthProvider().getSession());
};

export const bootstrapSession = async function () {
  setSessionLoading();

  try {
    return await getSession();
  } catch (error) {
    setSessionUser(null);
    throw error;
  }
};

export const login = async function (credentials) {
  return applySessionState(await getAuthProvider().login(credentials));
};

export const register = async function (payload) {
  return applySessionState(await getAuthProvider().register(payload));
};

export const logout = async function () {
  return applySessionState(await getAuthProvider().logout());
};
