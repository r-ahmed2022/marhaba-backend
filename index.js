import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { localize } from './middleware/localize.js';
import corsOptions from './config/corsOptions.js';
import leadRoutes from './routes/leadRoutes.js';
import queryRoutes from './routes/queryRoutes.js';
import { initDBConnections } from './config/db.js';
import { connectDomain } from './middleware/connectionMiddleware.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
initDBConnections();
const app = express();
app.set('trust proxy', true);
app.use(cors(corsOptions));
app.use(express.json());
app.use(localize);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'public')));
app.options(/^\/.*$/, cors(corsOptions), (req, res) => {
  res.sendStatus(204);
});

app.use(connectDomain);
app.use('/api/interest', leadRoutes);
app.use('/api/query', queryRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));