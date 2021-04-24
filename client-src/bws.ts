type Listener<T> = (x: T) => void;

// Maybe ephemeral listener.
// If it returns true, keep it around, otherwise drop it.
type EphListener<T> = (x: T) => boolean;

interface Subscribable<T> {
  addListener(l: Listener<T>): void;
  removeListener(l: Listener<T>): void;
}

class BufferedSubscribable<T> {
  // invariant: we are subscribed to the underlying subscribable if and
  // only if listeners is nonempty.

  buffer: T[] = [];
  listeners: EphListener<T>[] = [];

  constructor(private s: Subscribable<T>) { }

  msg(x: T): void {
    const l = this.listeners.pop();
    if (l != undefined) {
      this.dispatch(x, l);
      if (this.listeners.length == 0) {
        this.s.removeListener(l);
      }
    }
    else {
      this.buffer.unshift(x);
    }
  }

  unsub(l: EphListener<T>): void {
    const listenersWasEmpty = this.listeners.length == 0;
    this.listeners = this.listeners.filter(x => x != l);
    if (this.listeners.length == 0 && !listenersWasEmpty) {
      this.s.removeListener(l);
    }
  }

  sub(l: EphListener<T>): void {
    const x = this.buffer.pop();
    if (x != undefined) {
      this.dispatch(x, l);
    }
    else {
      const listenersWasEmpty = this.listeners.length == 0;
      this.listeners.unshift(l);
      if (listenersWasEmpty) {
        this.s.addListener(x => this.msg(x));
      }
    }
  }

  getOne(): Promise<T> {
    return new Promise((res, rej) => {
      this.sub(x => { res(x); return false });
    });
  }

  dispatch(x: T, l: EphListener<T>): void {
    if (l(x)) {
      this.sub(l);
    }
  }
}

export class WebsocketBufferedSubscribable extends BufferedSubscribable<MessageEvent> {
  constructor(ws: WebSocket) {
    super({
      addListener: l => { ws.addEventListener('message', l); },
      removeListener: l => { ws.removeEventListener('message', l); },
    });
  }
}

export type WsBundle = {
  ws: WebSocket,
  wbs: WebsocketBufferedSubscribable,
}
