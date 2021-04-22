import update from 'immutability-helper';

export type Tool = 'move' | 'speech' | 'add' | 'delete';

export const tools: Tool[] = ['move', 'speech', 'add', 'delete'];
export const TOOL_SIZE = { x: 48, y: 48 }; // scaled pixels;

export type MoveState =
  | { t: 'drag', actorIx: number, pt: Point, origPt: Point }
  | { t: 'up' }
  | { t: 'down' };

export type ToolState =
  | { t: 'move', s: MoveState }
  | { t: 'speech' }
  | { t: 'add' }
  | { t: 'delete' };
export type Point = { x: number, y: number };
export type Actor = { p: Point, msg: string, color: string };
export type State = {
  toolState: ToolState,
  actors: Actor[],
};

export const initState: State = {
  toolState: { t: 'move', s: { t: 'up' } },
  actors: [
    { color: 'red', msg: '', p: { x: 40, y: 50 } },
    { color: 'blue', msg: '', p: { x: 100, y: 100 } }
  ]
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
  }
}

export type InitMsg =
  { t: 'initState', s: State };

export type changeMsg =
  | { t: 'setSpeech', actorIx: number, msg: string }
  | { t: 'setPos', actorIx: number, p: Point }
  | { t: 'addActor', p: Point, color: string }
  | { t: 'deleteActor', actorIx: number };

export function reduceMsg(wm: changeMsg, s: State): State {
  switch (wm.t) {
    case 'setSpeech':
      return update(s, { actors: { [wm.actorIx]: { msg: { $set: wm.msg } } } });
    case 'setPos':
      return update(s, { actors: { [wm.actorIx]: { p: { $set: wm.p } } } });
    case 'addActor':
      return update(s, { actors: { $push: [{ color: wm.color, p: wm.p, msg: '' }] } });
    case 'deleteActor':
      return update(s, { actors: { $splice: [[wm.actorIx, 1]] } });
  }
}
