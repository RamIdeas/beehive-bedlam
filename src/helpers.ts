
const NOW = (): Time => window.performance.now();
const $ = (selector): HTMLElement => document.querySelector(selector);
const $$ = (selector): NodeListOf<HTMLElement> => document.querySelectorAll(selector);
const toDomXY = ( x: Pixels, y: Pixels ) => [ x + GRID_WIDTH/2, GRID_HEIGHT - y ];
const toGameXY = ( x: Pixels, y: Pixels ) => [ x - GRID_WIDTH/2, GRID_HEIGHT - y ];
const clamp = (x,min,max) => Math.max( min, Math.min( max, x ) );
const random = (min,max) => Math.random() * (max - min) + min;
const randomInt = (min,max) => Math.floor( random(min,max+1) );
const distance = (x: number, y: number) => Math.sqrt( x*x + y*y );

