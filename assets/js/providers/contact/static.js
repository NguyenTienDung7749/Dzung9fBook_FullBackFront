const buildMockContactMessage = function () {
  return {
    id: `static-contact-${Date.now()}`,
    status: 'RECEIVED',
    createdAt: new Date().toISOString()
  };
};

export const staticContactProvider = {
  async submit() {
    return {
      contactMessage: buildMockContactMessage()
    };
  }
};
