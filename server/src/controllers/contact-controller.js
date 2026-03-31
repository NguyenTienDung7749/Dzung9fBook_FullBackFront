const contactService = require('../services/contact-service');

const submitContact = async function (req, res, next) {
  try {
    const contactMessage = await contactService.submitContactMessage(req, req.body);
    res.status(201).json({ contactMessage });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitContact
};
