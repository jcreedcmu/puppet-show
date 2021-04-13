import express from 'express';

// import fs from 'fs';
// import https from 'https';
// import http from 'http';
import { init } from './server';

const app = express();
init(app);

app.listen(process.env.PORT, () => {
  console.log(`listening on port ${process.env.PORT}...`);
});
