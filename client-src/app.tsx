import { h, render, JSX } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';

type State = { s: string };

function useCanvas(msg: string) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    console.log('rendering');
    const canvas = canvasRef.current;
    const d = canvas.getContext('2d')!;
    d.clearRect(0, 0, 100, 100);
    d.fillStyle = 'black';
    d.fillRect(0, 0, 100, 100);
    d.fillStyle = 'white';
    d.fillText(msg, 20, 20);
  }, [msg]);
  return { canvasRef };
}

/** @jsx h */
export const App = () => {
  const [input, setInput] = useState<string>('...');
  const style: JSX.CSSProperties = {
    border: 'none',
    background: '#def',
    outline: 'none',
    fontSize: 24,
    fontFamily: 'courier new',
  };
  const { canvasRef } = useCanvas(input);
  const style2 = { ...style, fontFamily: "sans-serif" };
  const div1 =
    <div>
      <input size={40} spellcheck={false} style={style} value={input} onInput={e =>
        setInput(e.currentTarget.value)} />
    </div>;
  const div2 =
    <div>
      <input size={40} spellcheck={false} style={style2} value={input} onInput={e =>
        setInput(e.currentTarget.value)} />
    </div>;
  const canvas = <canvas ref={canvasRef} />
  return <span>{div1}{div2}{canvas}</span>;
}

export function run() {
  render(<App />, document.getElementById('root')!);
}
