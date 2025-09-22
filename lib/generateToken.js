import jwt from 'jsonwebtoken'
import dotenv from 'dotenv';
dotenv.config();
const generateToken = async (userID, res) => {
  const token = jwt.sign({ userID }, process.env.JWT_SECRET, {
    expiresIn: '2d'
  });

  return res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    domain: '.marhabaconnect.ae',
    maxAge: 2 * 24 * 60 * 60 * 1000,
    expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)

  });
};

export default generateToken;   