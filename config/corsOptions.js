// config/corsOptions.js
const allowedOrigins = [
  'https://marhabaconnect.onrender.com',
  'https://www.marhabaconnect.ae',
    'https://marhabaconnect.ae',
    'https://customercare.marhabaconnect.ae',
,  'https://www.cuttingedge-enterprises.in',
,  'https://cuttingedge-enterprises.in',
   'http://localhost:5173',
   'http://localhost:5174',
   'http://localhost:5175',
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  // Include OPTIONS to allow preflight for Socket.IO polling and credentials
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
};

export default corsOptions;