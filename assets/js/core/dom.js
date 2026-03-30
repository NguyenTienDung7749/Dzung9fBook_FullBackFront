export const qs = (selector, parent = document) => parent.querySelector(selector);

export const qsa = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
