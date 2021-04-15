import express from 'express';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { init } from './server';

const app = express();
const http_port = 3000;
const https_port = 3443;

http.createServer((req, res) => {
  res.writeHead(301, { "Location": `https://localhost:${https_port}${req.url}` });
  res.end();
}).listen(http_port);

const server = https.createServer({
  key: fs.readFileSync('dev.key'),
  cert: fs.readFileSync('dev.cert')
}, app);

init(app, server);

server.listen(https_port, '127.0.0.1', () => {
  console.log(`listening on port ${https_port}`);
});
