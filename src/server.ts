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
  const valid = (token !== undefined) &&
    (user !== undefined) &&
    (tokens[user] !== undefined) &&
    bcrypt.compareSync(token, tokens[user]);
  return valid;
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

export function init(
  app: express.Express,
  server: http.Server | https.Server,
  env: 'prod' | 'dev'
) {
  const ews = expressWs(app, server);

  app.set('views', path.join(__dirname, '../views'));
  app.set('view engine', 'ejs');

  app.use(cookieParser());
  app.use(bodyParser.urlencoded({ extended: true }));

  ews.app.ws('/connect', (ws, req) => {
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

  app.get('/',
    checkLoggedIn,
    (req, res) => {
      const host = env == 'dev' ? 'localhost:3443' : 'mammoth-chiller.glitch.me';
      const js = `w = new WebSocket("wss://${host}/connect"); w.onopen = () => { w.send("hi") }`;
      const extra = `<button onclick="${js.replace(/"/g, '&quot;')}">send</button>`;
      res.render('home', { user: req.user, extra });
    });

  app.get('/login',
    (req, res) => {
      res.render('login');
    });

  app.post('/hash',
    (req, res) => {
      const { user, password } = req.body;
      const cookie = { user, token: password };
      res.cookie('user', user);
      res.cookie('token', password);
      if (isValidCookie(cookie)) {
        res.redirect('/');
      }
      else {
        const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(8));
        res.render('hash', { hash });
      }
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

  app.get('/logout',
    (req, res) => {
      console.log(req);
      res.cookie('user', '');
      res.cookie('token', '');
      res.redirect('/');
    });


}
