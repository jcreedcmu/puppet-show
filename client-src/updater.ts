import update from 'immutability-helper';
import { Spec } from 'immutability-helper';

export function updater<T>(setState: (k: (x: T) => T) => void) {
  return (spec: Spec<T>) => {
    setState(s => update(s, spec));
  }
}
