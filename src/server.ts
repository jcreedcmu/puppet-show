import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import path from 'path';
import bcrypt from 'bcrypt';

const tokens: { [k: string]: string } = {
  'jcreed': '$2b$08$bU5nRZ8QY2eAcvRYRt0sI.1BPrT5.wQradm4Krrxz2PfbhKQezCuK',
};

declare module 'express-serve-static-core' {
  interface Request {
    user?: { username: string };
  }
}

function checkLoggedIn(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const user = req.cookies.user;
  const token = req.cookies.token;

  if (!token || !user || !tokens[user] || !bcrypt.compareSync(token, tokens[user])) {
    next();
  }
  else {
    req.user = { username: user };
    next();
  }
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

export function init(app: express.Express) {
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
}
