// config/corsOptions.js
const allowedOrigins = [
  'https://marhabaconnect.onrender.com',
  'https://www.marhabaconnect.ae',
  'https://www.cuttingedge-enterprises.in',
   'http://localhost:5173',
   'http://localhost:5174',
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
};

export default corsOptions;