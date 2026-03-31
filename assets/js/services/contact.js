import { isApiProviderMode } from '../config/runtime.js';
import { apiContactProvider } from '../providers/contact/api.js';
import { staticContactProvider } from '../providers/contact/static.js';

const getContactProvider = function () {
  return isApiProviderMode() ? apiContactProvider : staticContactProvider;
};

export const submitContact = async function (payload) {
  return getContactProvider().submit(payload);
};
