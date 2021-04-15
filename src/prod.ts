import express from 'express';

import http from 'http';
import { init } from './server';

const port = parseInt(process.env.PORT || '3000');
const app = express();
init(app, http.createServer(app), port);

app.listen(port, () => {
  console.log(`listening on port ${port}...`);
});
