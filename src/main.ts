import express from 'express';
import { submitHandler } from './submit';
import { statusHandler } from './status';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

const apiRouter = express.Router();
apiRouter.get('/submit', submitHandler);  // Register GET /api/submit
apiRouter.post('/submit', submitHandler); // Register POST /api/submit
apiRouter.get('/status', statusHandler);

app.use('/api', apiRouter);

// Start the server and log a message when it's running
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Catch any unhandled errors and log them
process.on('uncaughtException', err => {
  console.error('There was an uncaught error', err);
  process.exit(1); // Mandatory (as per the Node.js docs)
});