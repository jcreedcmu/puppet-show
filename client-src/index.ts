
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

console.log('hi');
async function go() {
  const ws = await state.ws;
  run(ws);
}
go();
