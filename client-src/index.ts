import { InitMsg, NUM_BACKGROUNDS } from '../src/state';
import { Assets, run } from './app';
import { WebsocketBufferedSubscribable, WsBundle } from './bws';

declare const env: 'dev' | 'prod';

function openWsTo(host: string): Promise<WsBundle> {
  return new Promise((res, rej) => {
    const ws = new WebSocket(`wss://${host}/connect`);
    res({ ws, wbs: new WebsocketBufferedSubscribable(ws) });
  });
}

function openWs(): Promise<WsBundle> {
  switch (env) {
    case 'dev': return openWsTo('localhost:3443');
    case 'prod': return openWsTo('mammoth-chiller.glitch.me');
  }
}

const state = { b: openWs() };

function delay(ms: number): Promise<void> {
  return new Promise((res, rej) => {
    setTimeout(() => res(), ms);
  });
}

async function getBackground(i: number): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = document.createElement('img');
    img.src = `/images/background-${i}.png`;
    img.onload = () => res(img);
  });
}
async function go() {
  document.fonts.add(await (new FontFace('CanvasFont', 'url(/fonts/Nitz.ttf)')).load());
  const b = await state.b;
  //  await delay(50);
  const { s } = JSON.parse((await b.wbs.getOne()).data) as InitMsg;
  const assets: Assets = { backgrounds: [] }
  for (let i = 1; i <= NUM_BACKGROUNDS; i++) {
    assets.backgrounds.push(await getBackground(i));
  }
  run(b, s, assets);
}
go();
