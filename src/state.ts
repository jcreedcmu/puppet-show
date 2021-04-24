import update from 'immutability-helper';

const _tools = ['move', 'speech', 'add', 'delete', 'bg'] as const;
export type Tool = (typeof _tools)[number];
export const tools: readonly Tool[] = _tools;

export const TOOL_SIZE = { x: 48, y: 48 }; // scaled pixels;
export const NUM_BACKGROUNDS = 4;

export type MoveState =
  | { t: 'drag', actorIx: number, pt: Point, origPt: Point }
  | { t: 'up' }
  | { t: 'down' };

export type ToolState =
  | { t: 'move', s: MoveState }
  | { t: 'speech' }
  | { t: 'add' }
  | { t: 'delete' }
  | { t: 'bg' };
export type Point = { x: number, y: number };
export type Actor = { p: Point, msg: string, color: string };
export type State = {
  toolState: ToolState,
  actors: Actor[],
  background: number,
};

export const initState: State = {
  toolState: { t: 'move', s: { t: 'up' } },
  actors: [
    { color: 'red', msg: '', p: { x: 40, y: 50 } },
    { color: 'blue', msg: '', p: { x: 100, y: 100 } }
  ],
  background: 0,
};

export function getActiveTool(state: State): Tool {
  return state.toolState.t;
}

export function initToolState(tool: Tool): ToolState {
  switch (tool) {
    case 'move': return { t: 'move', s: { t: 'up' } };
    case 'speech': return { t: 'speech' };
    case 'add': return { t: 'add' };
    case 'delete': return { t: 'delete' };
    case 'bg': return { t: 'bg' };
  }
}

export type InitMsg =
  { t: 'initState', s: State };

export type MsgAction =
  | { t: 'setSpeech', actorIx: number, msg: string }
  | { t: 'setPos', actorIx: number, p: Point }
  | { t: 'addActor', p: Point, color: string }
  | { t: 'deleteActor', actorIx: number }
  | { t: 'setBackground', bg: number }

export type Action = MsgAction
  | { t: 'moveToolAction', a: MoveToolAction }
  | { t: 'setTool', tool: Tool }

export type MoveToolAction =
  | { t: 'setPt', p: Point }
  | { t: 'startDrag', actorIx: number, p: Point }
  | { t: 'down' }
  | { t: 'up' }

export function reduceMoveTool(s: ToolState, a: MoveToolAction): ToolState {
  switch (a.t) {
    case 'setPt':
      return update(s, { s: { pt: { $set: a.p } } });
    case 'startDrag':
      return update(s, {
        s: { $set: { t: 'drag', actorIx: a.actorIx, origPt: a.p, pt: a.p } }
      });
    case 'down':
      return update(s, { s: { $set: { t: 'down' } } });
    case 'up':
      return update(s, { s: { $set: { t: 'up' } } });
  }
}

export function reduce(s: State, a: Action): State {
  switch (a.t) {
    case 'setSpeech':
      return update(s, { actors: { [a.actorIx]: { msg: { $set: a.msg } } } });
    case 'setPos':
      return update(s, { actors: { [a.actorIx]: { p: { $set: a.p } } } });
    case 'addActor':
      return update(s, { actors: { $push: [{ color: a.color, p: a.p, msg: '' }] } });
    case 'deleteActor':
      return update(s, { actors: { $splice: [[a.actorIx, 1]] } });
    case 'setBackground':
      return update(s, { background: { $set: a.bg } });
    case 'moveToolAction':
      return update(s, { toolState: { $apply: s => reduceMoveTool(s, a.a) } });
    case 'setTool':
      return update(s, { toolState: { $set: initToolState(a.tool) } });
  }
}
