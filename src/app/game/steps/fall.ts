import type { RuleStep } from '../rules';

export const fall: RuleStep = (state, _input, dtMs) => {
  if (state.status !== 'playing') {
    return state;
  }
  return {
    ...state,
    elapsedMs: state.elapsedMs + dtMs,
    objects: state.objects.map((o) => ({ ...o, y: o.y + o.speed * dtMs })),
  };
};
