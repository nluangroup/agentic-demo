import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { tick } from '../game/tick';
import {
  BASKET_WIDTH,
  BASKET_Y,
  FallingObject,
  GameState,
  HEIGHT,
  initialState,
  Input,
  OBJECT_SIZE,
  WIDTH,
} from '../game/state';

const BASKET_HEIGHT = 16;
const LEFT_CODES = ['ArrowLeft', 'KeyA'];
const RIGHT_CODES = ['ArrowRight', 'KeyD'];

@Component({
  selector: 'app-game-canvas',
  templateUrl: './game-canvas.html',
  styleUrl: './game-canvas.css',
  host: {
    '(window:keydown)': 'onKeyDown($event)',
    '(window:keyup)': 'onKeyUp($event)',
  },
})
export class GameCanvas {
  readonly seed = input<number>();
  readonly state = signal<GameState>(initialState(Date.now()));

  protected readonly message = computed(() => {
    const s = this.state();
    if (s.status === 'ready') {
      return 'Press Space to start';
    }
    if (s.status === 'over') {
      return `Game over — Score: ${s.score}`;
    }
    return '';
  });
  protected readonly restartHint = computed(() =>
    this.state().status === 'over' ? 'Press Space to play again' : '',
  );

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);
  private readonly keys = new Set<string>();
  private pointerX: number | null = null;
  private startPressed = false;

  constructor() {
    effect(() => {
      const seed = this.seed();
      if (seed !== undefined) {
        this.state.set(initialState(seed));
      }
    });

    afterNextRender(() => {
      this.setupBackingStore();
      this.draw();
      let last = performance.now();
      let frame = 0;
      const loop = (now: number): void => {
        this.step(now - last);
        last = now;
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
      this.destroyRef.onDestroy(() => cancelAnimationFrame(frame));
    });
  }

  step(dtMs: number): void {
    const input: Input = {
      left: LEFT_CODES.some((c) => this.keys.has(c)),
      right: RIGHT_CODES.some((c) => this.keys.has(c)),
      pointerX: this.pointerX,
      startPressed: this.startPressed,
    };
    this.startPressed = false;
    this.state.set(tick(this.state(), input, dtMs));
    this.draw();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      event.preventDefault();
      if (!event.repeat) {
        this.startPressed = true;
      }
    } else if ([...LEFT_CODES, ...RIGHT_CODES].includes(event.code)) {
      event.preventDefault();
      this.keys.add(event.code);
    }
  }

  protected onKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.code);
  }

  protected onPointerMove(event: PointerEvent): void {
    const rect = this.canvas().nativeElement.getBoundingClientRect();
    this.pointerX = ((event.clientX - rect.left) / rect.width) * WIDTH;
  }

  private setupBackingStore(): void {
    const canvas = this.canvas().nativeElement;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
  }

  private draw(): void {
    const canvas = this.canvas().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const scale = canvas.width / WIDTH;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const s = this.state();
    for (const o of s.objects) {
      this.drawObject(ctx, o);
    }
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.roundRect(s.basketX, BASKET_Y, BASKET_WIDTH, BASKET_HEIGHT, 6);
    ctx.fill();
  }

  private drawObject(ctx: CanvasRenderingContext2D, o: FallingObject): void {
    const r = OBJECT_SIZE / 2;
    const cx = o.x + r;
    const cy = o.y + r;
    ctx.beginPath();
    if (o.kind === 'rock') {
      ctx.fillStyle = '#8a8f99';
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    } else {
      ctx.fillStyle = '#ffd700';
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? r : r * 0.45;
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
    }
    ctx.fill();
  }
}
