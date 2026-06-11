import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import clickupHandler from './api/clickup.js';
import metaHandler from './api/meta.js';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3092;

// Middleware for parsing request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Endpoints routing to Vercel function handlers
app.all('/api/clickup', clickupHandler);
app.all('/api/meta', metaHandler);

// Resolve static files directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(__dirname));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
