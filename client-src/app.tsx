import { h, render, JSX } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import update from 'immutability-helper';

type Tool = 'move' | 'speech';

const tools: Tool[] = ['move', 'speech'];
const TOOL_SIZE = { x: 48, y: 48 }; // scaled pixels;

type MoveState =
  | { t: 'drag', actorIx: string, pt: Point, origPt: Point }
  | { t: 'up' }
  | { t: 'down' };

type ToolState =
  | { t: 'move', s: MoveState }
  | { t: 'speech' };
type Point = { x: number, y: number };
type Actor = { p: Point, msg: string, color: string };
type State = {
  toolState: ToolState,
  actors: Actor[],
};

function getActiveTool(state: State): Tool {
  return state.toolState.t;
}

function initToolState(tool: Tool): ToolState {
  switch (tool) {
    case 'move': return { t: 'move', s: { t: 'up' } };
    case 'speech': return { t: 'speech' };
  }
}

const WIDTH = 640;
const HEIGHT = 480;

function relpos<T extends HTMLElement>(event: JSX.TargetedMouseEvent<T>): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: event.pageX - rect.left,
    y: event.pageY - rect.top
  };
}

function bubble(d: CanvasRenderingContext2D, p: Point, msg: string) {
  const off = { x: 5, y: -25 };
  const thick = 2;
  const save = d.fillStyle;
  const text_width = msg.length * 6 + 1;
  const text_height = 12;
  const baseline = 9;
  d.fillRect(p.x + off.x - thick, p.y + off.y - thick, thick * text_width + 2 * thick, thick * text_height + 2 * thick);
  d.fillStyle = 'white';
  d.fillRect(p.x + off.x, p.y + off.y, thick * text_width, thick * text_height);
  d.fillStyle = save;

  d.font = "24px CanvasFont";
  d.imageSmoothingEnabled = false;
  d.fillText(msg, p.x + off.x, p.y + off.y + baseline * thick);
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
    }
  }, [state]);
  return { canvasRef };
}

function hitTest(actor: Actor, p: Point) {
  return (p.x < actor.p.x + 20 && p.x > actor.p.x - 20 &&
    p.y < actor.p.y + 20 && p.y > actor.p.y - 20);
}

type wsMsg = {
  actorIx: number,
  msg: string,
}

function sendWsMsg(ws: WebSocket, msg: wsMsg): void {
  ws.send(JSON.stringify(msg));
}

function useWsListener(ws: WebSocket, handler: (msg: wsMsg) => void) {
  const h = (e: MessageEvent) => {
    handler(JSON.parse(e.data) as wsMsg);
  };
  useEffect(() => {
    ws.addEventListener('message', h);
    return () => ws.removeEventListener('message', h);
  });
}


export const App = (props: { ws: WebSocket }) => {
  const { ws } = props;
  const [input, setInput] = useState<string>('...');
  const [cursor, setCursor] = useState<boolean>(false);
  const [state, setState] = useState<State>({
    toolState: { t: 'move', s: { t: 'up' } },
    actors: [
      { color: 'red', msg: 'hello', p: { x: 40, y: 50 } },
      { color: 'blue', msg: 'world', p: { x: 100, y: 100 } }
    ]
  });

  useWsListener(ws, reduceMsg);

  const style: JSX.CSSProperties = {
    background: '#def',
    width: '100%',
    outline: 'none',
    fontSize: 24,
    fontFamily: 'courier new',
  };
  const { canvasRef } = useCanvas(state);

  const onMouseMove: (e: JSX.TargetedMouseEvent<HTMLCanvasElement>) => void = (e) => {
    const p = relpos(e);
    for (const actor of state.actors) {
      if (hitTest(actor, p)) {
        setCursor(true);
        return;
      }
    }
    setCursor(false);
  };

  function reduceMsg(wm: wsMsg) {
    setState(update(state, { actors: { [wm.actorIx]: { msg: { $set: wm.msg } } } }));
  }

  function changeSpeech(actorIx: number) {
    const wm: wsMsg = { actorIx, msg: input };
    // reduceMsg(wm);
    sendWsMsg(ws, wm);
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
            return setState(update(state, { toolState: { s: { $set: { t: 'down' } } } }));
          case 'down':
            return setState(update(state, { toolState: { s: { $set: { t: 'down' } } } }));
          case 'drag':
            return setState(update(state, { toolState: { s: { $set: { t: 'down' } } } }));
        }
        break;
      case 'speech':
        hitAnd(p, ix => changeSpeech(ix));
    }
  };

  const onMouseUp: (e: JSX.TargetedMouseEvent<HTMLCanvasElement>) => void = (e) => {
    e.preventDefault();
    const p = relpos(e);
    switch (state.toolState.t) {
      case 'move':
        switch (state.toolState.s.t) {
          case 'up':
            return setState(update(state, { toolState: { s: { $set: { t: 'up' } } } }));
          case 'down':
            return setState(update(state, { toolState: { s: { $set: { t: 'up' } } } }));
          case 'drag':
            return setState(update(state, { toolState: { s: { $set: { t: 'up' } } } }));
        }
        break;
      case 'speech':
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
  const canvas = <canvas {...canvasProps} />;
  const toolDivs = tools.map((tool, ix) => {
    const active = getActiveTool(state) == tool;
    const pos: JSX.CSSProperties = { backgroundPositionX: active ? 0 : TOOL_SIZE.x, backgroundPositionY: TOOL_SIZE.y * ix };
    function onClick() {
      console.log('whup');
      setState(update(state, { toolState: { $set: initToolState(tool) } }));
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

export function run(ws: WebSocket) {
  render(<App ws={ws} />, document.getElementById('root')!);
}
