const DEFAULT_RUNTIME_CONFIG = {
  providerMode: 'static',
  apiBaseUrl: '/api'
};

const normalizeProviderMode = function (value) {
  return String(value || '').trim().toLowerCase() === 'api' ? 'api' : 'static';
};

const readWindowRuntime = function () {
  if (typeof window === 'undefined' || !window.__DZUNG9FBOOK_RUNTIME__) {
    return {};
  }

  return window.__DZUNG9FBOOK_RUNTIME__;
};

const runtimeSource = readWindowRuntime();

export const RUNTIME_CONFIG = Object.freeze({
  providerMode: normalizeProviderMode(runtimeSource.providerMode || DEFAULT_RUNTIME_CONFIG.providerMode),
  apiBaseUrl: String(runtimeSource.apiBaseUrl || DEFAULT_RUNTIME_CONFIG.apiBaseUrl).trim() || DEFAULT_RUNTIME_CONFIG.apiBaseUrl
});

export const isApiProviderMode = function () {
  return RUNTIME_CONFIG.providerMode === 'api';
};
