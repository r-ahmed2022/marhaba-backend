// config/corsOptions.js
const allowedOrigins = [
  'https://marhaba-frontend.onrender.com',
  'https://www.marhabaconnect.com',
  'http://localhost:3000' // add localhost for dev
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