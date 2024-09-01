import express from 'express';
import cors from 'cors'; 
import { submitHandler } from './submit';
import { statusHandler } from './status';

const app = express();
const PORT = process.env.PORT || 3000;

// Trust the proxy
app.set('trust proxy', 1); // Trust first proxy

// Middleware to parse JSON bodies
app.use(express.json());

// Configure CORS
app.use(cors({
  origin: ['https://legaciesofmenv2.pages.dev', 'https://legaciesofmen.org'],
  methods: ['GET', 'POST'], 
  credentials: true, 
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const apiRouter = express.Router();
apiRouter.get('/submit', submitHandler);  
apiRouter.post('/submit', submitHandler);
apiRouter.get('/status', statusHandler);

app.use('/api', apiRouter);

// Start the server and log a message when it's running
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

process.on('uncaughtException', err => {
  console.error('There was an uncaught error', err);
  process.exit(1); 
});
