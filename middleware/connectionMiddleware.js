// middleware/connectionMiddleware.js
import dotenv from 'dotenv';
import { get } from 'mongoose';
import connections from '../config/db.js';

dotenv.config();

export function connectDomain(req, res, next) {
  // const host = req.hostname;
  let origin = req.headers.origin || req.headers.referer || '';
  const host = origin
              .toLowerCase()
              .replace(/^https?:\/\//, '')   
              .replace(/^www\./, '')         
              .split(':')[0];   

  const firmHeader = req.headers['x-firm'] || 'marhabaconnect';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  if (isLocalhost) {
    if (!firmHeader) {
      return res.status(400).json({ error: 'X-Firm header required in development' });
    }
    if (firmHeader === 'cuttingedge') {
      req.db = connections.cuttingedge;
      req.firm = 'cuttingedge';
    } else if (firmHeader === 'marhabaconnect') {
      req.db = connections.marhabaconnect;
      req.firm = 'marhabaconnect';
    } else {
      return res.status(400).json({ error: 'Invalid X-Firm header value' });
    }
  }  else {
    if (host === 'cuttingedge-enterprises.in') {
      req.db = connections.cuttingedge;
      req.firm = 'cuttingedge';
    } else if (host === 'marhabaconnect.ae') {
      req.db = connections.marhabaconnect;
      req.firm = 'marhabaconnect';
    } else {
      return res.status(400).json({ error: 'Unknown domain' });
    }
  }

  next();
}