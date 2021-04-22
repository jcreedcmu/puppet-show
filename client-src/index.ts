
import { InitMsg } from '../src/state';
import { run } from './app';
declare const env: 'dev' | 'prod';

function openWsTo(host: string): Promise<WebSocket> {
  return new Promise((res, rej) => {
    const w = new WebSocket(`wss://${host}/connect`);
    w.onopen = () => { res(w); };
  });
}

function openWs(): Promise<WebSocket> {
  switch (env) {
    case 'dev': return openWsTo('localhost:3443');
    case 'prod': return openWsTo('mammoth-chiller.glitch.me');
  }
}

const state = { ws: openWs() };


async function sendMsg() {
  const ws = await state.ws;
  ws.send("Hello, world");
}

// this is just to thwart esbuild's tree-shaking.
// It even sees through `if (0)`...
if ((env as string) == 'never') {
  sendMsg();
}

function getOneMessage(ws: WebSocket): Promise<string> {
  return new Promise((res, rej) => {
    function getInitState(e: MessageEvent) {
      console.log(e.data);
      ws.removeEventListener('message', getInitState);
      res(e.data);
    }
    ws.addEventListener('message', getInitState);
  });
}

async function go() {
  document.fonts.add(await (new FontFace('CanvasFont', 'url(/fonts/Nitz.ttf)')).load());
  const ws = await state.ws;
  const { s } = JSON.parse(await getOneMessage(ws)) as InitMsg;
  run(ws, s);
}
go();
