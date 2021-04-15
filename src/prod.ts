import express from 'express';

import http from 'http';
import { init } from './server';

const app = express();
init(app, http.createServer(app));

app.listen(process.env.PORT, () => {
  console.log(`listening on port ${process.env.PORT}...`);
});
