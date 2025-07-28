export const localize = (req, res, next) => {
  const acceptLang = req.headers['accept-language'] || 'en';

  const langCode = acceptLang.split(',')[0].split('-')[0];

  req.locale = langCode;
  next();
};