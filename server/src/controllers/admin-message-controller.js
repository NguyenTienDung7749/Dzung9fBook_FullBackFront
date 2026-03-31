const contactService = require('../services/contact-service');

const listMessages = async function (req, res, next) {
  try {
    res.json({
      items: await contactService.listAdminMessages(req.query)
    });
  } catch (error) {
    next(error);
  }
};

const updateMessageStatus = async function (req, res, next) {
  try {
    res.json({
      message: await contactService.updateAdminMessageStatus(req.params.id, req.currentUser.id, req.body)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listMessages,
  updateMessageStatus
};
