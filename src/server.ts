import bcrypt from 'bcrypt';
import bodyParser from 'body-parser';
import { parse as parseCookie } from 'cookie';
import cookieParser from 'cookie-parser';
import express from 'express';
import expressWs from 'express-ws';
import http from 'http';
import https from 'https';
import path from 'path';
import * as WebSocket from 'ws';
import { changeMsg, InitMsg, initState, reduceMsg, State } from './state';

const tokens: { [k: string]: string } = {
  'jcreed': '$2b$08$bU5nRZ8QY2eAcvRYRt0sI.1BPrT5.wQradm4Krrxz2PfbhKQezCuK',
  'cmartens': '$2b$08$9dkR/TPhCF3.iGbqbpjWd.gH00I38oXuC.D3AIc0XN1EASR729nzu',
  'wlovas': '$2b$08$MOa0G8kHpgd9x6J2NjMUh.RhKMMFaluZNhpG9fk9vTqqYCmfp.U5O',
};

declare module 'express-serve-static-core' {
  interface Request {
    user?: { username: string };
  }
}

const state: { s: State } = { s: initState };

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

let idCounter = 0;
type Conn = { user: string, ws: WebSocket };
const connections: { [id: string]: Conn } = {}

function broadcast(msg: string) {
  Object.values(connections).forEach(conn => {
    conn.ws.send(msg);
  });
}

export function init(
  app: express.Express,
  server: http.Server | https.Server,
  env: 'prod' | 'dev'
) {
  const ews = env == 'dev' ? expressWs(app, server) : expressWs(app);

  app.set('views', path.join(__dirname, '../views'));
  app.set('view engine', 'ejs');

  app.use(cookieParser());
  app.use(bodyParser.urlencoded({ extended: true }));

  ews.app.ws('/connect', (ws, req) => {
    const cookie = parseCookie(req.headers.cookie || '') as Cookie;
    // This is the authentication barrier to arbitrary clients sending ws commands.
    if (isValidCookie(cookie)) {
      const id = idCounter++;
      connections[id] = { user: cookie.user, ws };
      const im: InitMsg = { t: 'initState', s: state.s };
      ws.send(JSON.stringify(im));
      ws.addEventListener('message', (msg) => {
        console.log(">", msg.data);
        state.s = reduceMsg(JSON.parse(msg.data) as changeMsg, state.s);
        broadcast(msg.data);
      });
      ws.addEventListener('close', () => {
        delete connections[id];
      });
    }
    else {
      console.log("Unauthorized websocket connection attempt XXX more debugging info here");
      ws.close();
    }
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

  app.get('/logout',
    (req, res) => {
      res.cookie('user', '');
      res.cookie('token', '');
      res.redirect('/');
    });


  app.get('/home',
    checkLoggedIn,
    (req, res) => {
      res.render('home', { user: req.user, extra: '' });
    });

  app.get('/js/env.js', (req, res) => {
    if (env == 'dev')
      res.send('const env = "dev"');
    else
      res.send('const env = "prod"');
  });

  app.use('/', express.static(path.join(__dirname, '../public')));


}
