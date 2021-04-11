import express from 'express';
import fs from 'fs';
import https from 'https';
import { init } from './server';

const app = express();
const port = 3000;
const server = https.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.cert')
}, app);

init(app);

server.listen(port, '127.0.0.1', () => {
  console.log(`listening on port ${port}`);
});
