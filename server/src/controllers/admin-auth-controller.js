const getAdminMe = async function (req, res, next) {
  try {
    res.json({
      user: req.currentUser || null
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminMe
};
