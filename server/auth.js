function requireRole(allowedGroups = []) {
  return (req, res, next) => {
    const userRole = req.session?.user?.role || 'guest';

    if (!allowedGroups.includes(userRole)) {
      return res.status(403).send('Forbidden');
    }

    req.user = req.session.user;
    next();
  };
}

module.exports = { requireRole };