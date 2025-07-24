export const localize = (req, res, next) => {
  const acceptLang = req.headers['accept-language'] || 'en';

  // Extract base language like 'en', 'ar', etc.
  const langCode = acceptLang.split(',')[0].split('-')[0];

  // Attach to request for downstream use
  req.locale = langCode;
  next();
};