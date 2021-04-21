import { h, render, JSX } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import update from 'immutability-helper';

type Point = { x: number, y: number };
type Actor = { p: Point, msg: string, color: string };
type State = { actors: Actor[] };

const WIDTH = 640;
const HEIGHT = 480;

function relpos<T extends HTMLElement>(event: JSX.TargetedMouseEvent<T>): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: event.pageX - rect.left,
    y: event.pageY - rect.top
  };
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
        d.fillText(msg, p.x + 50, p.y);
      });
    }
  }, [state]);
  return { canvasRef };
}

function hitTest(actor: Actor, p: Point) {
  return (p.x < actor.p.x + 20 && p.x > actor.p.x - 20 &&
    p.y < actor.p.y + 20 && p.y > actor.p.y - 20);
}

export const App = () => {
  const [input, setInput] = useState<string>('...');
  const [cursor, setCursor] = useState<boolean>(false);
  const style: JSX.CSSProperties = {
    border: 'none',
    background: '#def',
    outline: 'none',
    fontSize: 24,
    fontFamily: 'courier new',
  };
  const [state, setState] = useState<State>({
    actors: [
      { color: 'red', msg: 'hello', p: { x: 40, y: 50 } },
      { color: 'blue', msg: 'world', p: { x: 100, y: 100 } }
    ]
  });
  const { canvasRef } = useCanvas(state);

  const div1 =
    <div>
      <input size={40} spellcheck={false} style={style} value={input} onInput={e =>
        setInput(e.currentTarget.value)} />
    </div>;

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

  function doClick(actorIx: number) {
    setState(update(state, { actors: { [actorIx]: { msg: { $set: input } } } }));
  }

  const onClick: (e: JSX.TargetedMouseEvent<HTMLCanvasElement>) => void = (e) => {
    const p = relpos(e);
    for (const [ix, actor] of state.actors.entries()) {
      if (hitTest(actor, p)) {
        doClick(ix);
        return;
      }
    }
    setCursor(false);
  };

  const canvasProps = {
    style: { cursor: cursor ? 'pointer' : undefined, border: '1px solid black' },
    width: WIDTH,
    height: HEIGHT,
    ref: canvasRef,
    onMouseMove,
    onClick,
  };
  return <span><canvas {...canvasProps} /><br /><br />{div1}</span>;
}

export function run() {
  render(<App />, document.getElementById('root')!);
}
