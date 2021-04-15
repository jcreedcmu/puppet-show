import bcrypt from 'bcrypt';
import bodyParser from 'body-parser';
import { parse as parseCookie } from 'cookie';
import cookieParser from 'cookie-parser';
import express from 'express';
import expressWs from 'express-ws';
import http from 'http';
import https from 'https';
import path from 'path';

const tokens: { [k: string]: string } = {
  'jcreed': '$2b$08$bU5nRZ8QY2eAcvRYRt0sI.1BPrT5.wQradm4Krrxz2PfbhKQezCuK',
};

declare module 'express-serve-static-core' {
  interface Request {
    user?: { username: string };
  }
}

type Cookie = { user?: string, token?: string };
type ValidCookie = { user: string, token: string };

function isValidCookie(cookie: Cookie): cookie is ValidCookie {
  const { user, token } = cookie;
  return (token !== undefined) &&
    (user !== undefined) &&
    (tokens[user] !== undefined) &&
    bcrypt.compareSync(token, tokens[user]);
}

function checkLoggedIn(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const cookie: Cookie = req.cookies;
  if (isValidCookie(cookie)) {
    req.user = { username: cookie.user };
  }
  next();
}

function ensureLoggedIn(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (!req.user) {
    res.status(403).send('permission denied');
  }
  else {
    next();
  }
}

export function init(rawApp: express.Express, server: http.Server | https.Server, port: number) {
  const { app } = expressWs(rawApp);

  app.set('views', path.join(__dirname, '../views'));
  app.set('view engine', 'ejs');

  app.use(cookieParser());
  app.use(bodyParser.urlencoded({ extended: true }));


  app.get('/',
    checkLoggedIn,
    (req, res) => {
      res.render('home', { user: req.user });
    });

  app.get('/make-token',
    (req, res) => {
      res.render('make-token');
    });

  app.post('/hash',
    (req, res) => {
      const password = req.body.password;
      const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(8));
      res.render('hash', { hash });
    });

  app.get('/profile',
    checkLoggedIn,
    ensureLoggedIn,
    (req, res) => {
      res.render('profile', { user: req.user });
    });

  app.get('/cookie',
    (req, res) => {
      console.log(req);
      res.render('cookie', { cookie: JSON.stringify(req.cookies) });
    });

  app.ws('/connect', (ws, req) => {
    const cookie = parseCookie(req.headers.cookie || '') as Cookie;
    // This is the authentication barrier to arbitrary clients sending ws commands.
    if (isValidCookie(cookie)) {
      ws.onmessage = (msg) => {
        console.log(">", msg.data);
      };
    }
    else {
      console.log("Unauthorized websocket connection attempt XXX more debugging info here");
      ws.close();
    }
  });
}
