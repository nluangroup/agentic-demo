import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameCanvas } from './game-canvas';
import { BASKET_WIDTH } from '../game/state';
import { withState } from '../game/testing';

function text(fixture: ComponentFixture<GameCanvas>, id: string): string {
  const el = (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);
  return el?.textContent?.trim() ?? '';
}

function key(type: 'keydown' | 'keyup', code: string, repeat = false): void {
  window.dispatchEvent(new KeyboardEvent(type, { key: code, code, repeat }));
}

describe('GameCanvas', () => {
  let fixture: ComponentFixture<GameCanvas>;
  let component: GameCanvas;

  beforeEach(async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await TestBed.configureTestingModule({ imports: [GameCanvas] }).compileComponents();
    fixture = TestBed.createComponent(GameCanvas);
    fixture.componentRef.setInput('seed', 42);
    await fixture.whenStable();
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
  });

  it('shows the start screen with score 0', () => {
    expect(text(fixture, 'message')).toBe('Press Space to start');
    expect(text(fixture, 'score')).toBe('Score: 0');
    expect(text(fixture, 'lives')).toBe('Lives: 3');
  });

  it('space starts the game once per press', async () => {
    key('keydown', 'Space');
    component.step(16);
    expect(component.state().status).toBe('playing');

    component.state.set(withState({ status: 'over', score: 1 }));
    key('keydown', 'Space', true);
    component.step(16);
    expect(component.state().status).toBe('over');

    key('keyup', 'Space');
    key('keydown', 'Space');
    component.step(16);
    expect(component.state().status).toBe('playing');
    component.state.set(withState({ status: 'over' }));
    component.step(16);
    expect(component.state().status).toBe('over');
  });

  it('maps pointer x through the scaled canvas', () => {
    const canvas = (fixture.nativeElement as HTMLElement).querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 240,
    } as DOMRect);
    component.state.set(withState());
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: 120 }));
    component.step(16);
    expect(component.state().basketX + BASKET_WIDTH / 2).toBeCloseTo(240, 0);
  });

  it('keeps last pointer x after pointerleave', () => {
    const canvas = (fixture.nativeElement as HTMLElement).querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 480,
    } as DOMRect);
    component.state.set(withState());
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: 100 }));
    canvas.dispatchEvent(new PointerEvent('pointerleave'));
    component.step(16);
    expect(component.state().basketX + BASKET_WIDTH / 2).toBeCloseTo(100, 0);
  });

  it('keyboard takes over from the pointer', () => {
    const canvas = (fixture.nativeElement as HTMLElement).querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 480,
    } as DOMRect);
    component.state.set(withState());
    canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: 100 }));
    component.step(16);
    const afterPointer = component.state().basketX;
    key('keydown', 'ArrowRight');
    component.step(100);
    expect(component.state().basketX).toBeGreaterThan(afterPointer);
  });

  it('window blur releases held keys', () => {
    component.state.set(withState());
    key('keydown', 'ArrowRight');
    window.dispatchEvent(new Event('blur'));
    const before = component.state().basketX;
    component.step(100);
    expect(component.state().basketX).toBe(before);
  });

  it('shows game over text with the score', async () => {
    component.state.set(withState({ status: 'over', score: 7, lives: 0 }));
    await fixture.whenStable();
    expect(text(fixture, 'message')).toContain('Game over — Score: 7');
    expect(text(fixture, 'message')).toContain('Press Space to play again');
  });
});
