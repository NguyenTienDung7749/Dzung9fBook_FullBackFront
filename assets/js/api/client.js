import { RUNTIME_CONFIG } from '../config/runtime.js';

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = Number(options.status) || 500;
    this.payload = options.payload || null;
    this.url = options.url || '';
  }
}

const buildApiUrl = function (pathname) {
  const normalizedPathname = String(pathname || '').startsWith('/') ? pathname : `/${pathname}`;
  return `${RUNTIME_CONFIG.apiBaseUrl}${normalizedPathname}`;
};

const buildRequestInit = function (options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  };
  const init = {
    method: options.method || 'GET',
    credentials: 'include',
    headers
  };

  if (options.body !== undefined) {
    init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);

    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  return init;
};

const parseResponsePayload = async function (response) {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();

  if (!contentType.includes('application/json')) {
    const text = await response.text();
    return text ? { message: text } : null;
  }

  return response.json();
};

export const requestJson = async function (pathname, options = {}) {
  const url = buildApiUrl(pathname);
  const response = await fetch(url, buildRequestInit(options));
  const payload = response.status === 204 ? null : await parseResponsePayload(response);

  if (!response.ok) {
    throw new ApiError(
      payload?.message || `Request failed with status ${response.status}.`,
      {
        status: response.status,
        payload,
        url
      }
    );
  }

  return payload;
};

export const getJson = function (pathname) {
  return requestJson(pathname, { method: 'GET' });
};

export const postJson = function (pathname, body) {
  return requestJson(pathname, {
    method: 'POST',
    body
  });
};

export const patchJson = function (pathname, body) {
  return requestJson(pathname, {
    method: 'PATCH',
    body
  });
};

export const deleteJson = function (pathname) {
  return requestJson(pathname, { method: 'DELETE' });
};
