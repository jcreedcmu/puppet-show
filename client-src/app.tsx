import { h, render, JSX } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { State, changeMsg, reduceMsg, Point, Actor, tools, getActiveTool, TOOL_SIZE, initToolState, InitMsg } from '../src/state';
import { updater } from './updater';

const SCALE = 2;
const WIDTH = 640;
const HEIGHT = 480;
const COLORS = ['red', 'green', 'blue', 'orange', 'purple', 'pink', 'black', 'brown'];

function randItem<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}


function relpos<T extends HTMLElement>(event: JSX.TargetedMouseEvent<T>): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: event.pageX - rect.left,
    y: event.pageY - rect.top
  };
}

function bubble(d: CanvasRenderingContext2D, p: Point, msg: string) {
  if (msg === undefined || msg === '')
    return;

  const off = { x: 5, y: -25 };
  const save = d.fillStyle;
  const text_width = msg.length * 6 + 1;
  const text_height = 12;
  const baseline = 9;
  d.fillRect(p.x + off.x - SCALE, p.y + off.y - SCALE, SCALE * text_width + 2 * SCALE, SCALE * text_height + 2 * SCALE);
  d.fillStyle = 'white';
  d.fillRect(p.x + off.x, p.y + off.y, SCALE * text_width, SCALE * text_height);
  d.fillStyle = save;

  d.font = "24px CanvasFont";
  d.imageSmoothingEnabled = false;
  d.fillText(msg, p.x + off.x, p.y + off.y + baseline * SCALE);
}

function useCanvas(state: State) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas != null) {
      const d = canvas.getContext('2d')!;
      d.clearRect(0, 0, WIDTH, HEIGHT);

      state.actors.forEach(actor => {
        const { p, msg, color } = actor;
        d.fillStyle = color;
        d.fillRect(p.x - 20, p.y - 20, 40, 40);
        bubble(d, p, msg);
      });
      if (state.toolState.t == 'move' && state.toolState.s.t == 'drag') {
        const { actorIx, origPt, pt } = state.toolState.s;
        const { p, msg, color } = state.actors[actorIx];
        d.fillStyle = 'rgba(0,0,0,0.25)';
        d.fillRect(p.x - 20 + pt.x - origPt.x, p.y - 20 + pt.y - origPt.y, 40, 40);
      }
    }
  }, [state]);
  return { canvasRef };
}

function hitTest(actor: Actor, p: Point) {
  return (p.x < actor.p.x + 20 && p.x > actor.p.x - 20 &&
    p.y < actor.p.y + 20 && p.y > actor.p.y - 20);
}


function sendWsMsg(ws: WebSocket, msg: changeMsg): void {
  ws.send(JSON.stringify(msg));
}

function useWsListener(ws: WebSocket, handler: (msg: changeMsg) => void) {
  const h = (e: MessageEvent) => {
    handler(JSON.parse(e.data) as changeMsg);
  };
  useEffect(() => {
    ws.addEventListener('message', h);
    return () => ws.removeEventListener('message', h);
  });
}

export const App = (props: { ws: WebSocket, initState: State }) => {
  const { ws, initState } = props;
  const [input, setInput] = useState<string>('...');
  const [cursor, setCursor] = useState<boolean>(false);
  const [state, setState] = useState<State>(initState);

  const upd = updater(setState);

  useWsListener(ws, msg => {
    setState(s => reduceMsg(msg, s));
  });

  const style: JSX.CSSProperties = {
    background: '#def',
    width: '100%',
    outline: 'none',
    fontSize: 24,
    fontFamily: 'courier new',
  };
  const { canvasRef } = useCanvas(state);

  const onMouseMove: (e: JSX.TargetedMouseEvent<HTMLCanvasElement>) => void = (e) => {
    e.preventDefault();
    const p = relpos(e);

    switch (state.toolState.t) {
      case 'move':
        switch (state.toolState.s.t) {
          case 'drag':
            return upd({ toolState: { s: { pt: { $set: p } } } });
          case 'up':
          case 'down':
            break;
        }
        break;
      case 'speech':
        break;
    }

    if (hitAnd(p, ix => setCursor(true))) {
      // do nothing else
    }
    else {
      setCursor(false);
    }
  };


  function changeSpeech(actorIx: number) {
    sendWsMsg(ws, { t: 'setSpeech', actorIx, msg: input });
  }

  function changePos(actorIx: number, p: Point) {
    sendWsMsg(ws, { t: 'setPos', actorIx, p });
  }

  function addActor(p: Point, color: string) {
    sendWsMsg(ws, { t: 'addActor', p, color });
  }

  function deleteActor(actorIx: number) {
    sendWsMsg(ws, { t: 'deleteActor', actorIx });
  }


  function hitAnd(p: Point, k: (actorIx: number) => void): boolean {
    for (const [ix, actor] of state.actors.entries()) {
      if (hitTest(actor, p)) {
        k(ix);
        return true;
      }
    }
    return false;
  }

  const onMouseDown: (e: JSX.TargetedMouseEvent<HTMLCanvasElement>) => void = (e) => {
    e.preventDefault();
    const p = relpos(e);
    switch (state.toolState.t) {
      case 'move':
        switch (state.toolState.s.t) {
          case 'up':
            if (hitAnd(p, ix => {
              upd({
                toolState: {
                  s: {
                    $set:
                      { t: 'drag', actorIx: ix, origPt: p, pt: p }
                  }
                }
              })
            })) {
              return;
            }
            else {
              return upd({ toolState: { s: { $set: { t: 'down' } } } });
            }
          case 'down':
            return upd({ toolState: { s: { $set: { t: 'down' } } } }); // XXX
          case 'drag':
            return upd({ toolState: { s: { $set: { t: 'down' } } } }); // XXX
        }
        break;
      case 'speech':
        return hitAnd(p, ix => changeSpeech(ix));
      case 'add':
        return addActor(p, randItem(COLORS));
      case 'delete':
        return hitAnd(p, ix => deleteActor(ix));
    }
  };

  const onMouseUp: (e: JSX.TargetedMouseEvent<HTMLCanvasElement>) => void = (e) => {
    e.preventDefault();
    const p = relpos(e);
    switch (state.toolState.t) {
      case 'move':
        switch (state.toolState.s.t) {
          case 'up':
            return upd({ toolState: { s: { $set: { t: 'up' } } } });
          case 'down':
            return upd({ toolState: { s: { $set: { t: 'up' } } } });
          case 'drag':
            const { actorIx, pt, origPt } = state.toolState.s;
            const prev = state.actors[actorIx].p;
            changePos(actorIx, {
              x: prev.x + pt.x - origPt.x,
              y: prev.y + pt.y - origPt.y
            });
            return upd({ toolState: { s: { $set: { t: 'up' } } } });
        }
        break;
      case 'add':
        break;
      case 'delete':
        break;
      case 'speech':
        break;
    }
  };



  const canvasProps = {
    style: { cursor: cursor ? 'pointer' : undefined, border: '1px solid black' },
    width: WIDTH,
    height: HEIGHT,
    ref: canvasRef,
    onMouseDown,
    onMouseUp,
    onMouseMove,
  };
  const backgroundSize = `${TOOL_SIZE.x * 2}px ${TOOL_SIZE.y * tools.length}px`;
  const canvas = <canvas {...canvasProps} />;
  const toolDivs = tools.map((tool, ix) => {
    const active = getActiveTool(state) == tool;
    const pos: JSX.CSSProperties = {
      backgroundSize,
      backgroundPositionX: active ? 0 : TOOL_SIZE.x,
      backgroundPositionY: -TOOL_SIZE.y * ix
    };
    function onClick() {
      upd({ toolState: { $set: initToolState(tool) } });
    }
    return <div className="tool" style={pos} onClick={onClick} />
  });

  const div1 = getActiveTool(state) == 'speech' ?
    <div>
      <input spellcheck={false} style={style} value={input} onInput={e =>
        setInput(e.currentTarget.value)} />
    </div> : <span />;

  const toolbar = <div>{toolDivs}</div>
  return <table><tr><td rowSpan={2}>{toolbar}</td><td>{canvas}</td></tr>
    <tr><td>{div1}</td></tr></table>;
}

export function run(ws: WebSocket, s: State) {
  render(<App ws={ws} initState={s} />, document.getElementById('root')!);
}
