import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { localize } from './middleware/localize.js';
import corsOptions from './config/corsOptions.js';
import leadRoutes from './routes/leadRoutes.js';
import queryRoutes from './routes/queryRoutes.js';

dotenv.config();
connectDB();

const app = express();
app.use(cors(corsOptions));
app.use(express.json());
app.use(localize);
app.use('/api/interest', leadRoutes);
app.use('/api/query', queryRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));