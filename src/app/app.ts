import { Component } from '@angular/core';
import { GameCanvas } from './game-canvas/game-canvas';

@Component({
  imports: [GameCanvas],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
