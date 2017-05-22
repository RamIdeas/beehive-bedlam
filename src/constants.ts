
type Time = number;
type Pixels = number;

const { PI } = Math;

const FPS = 60;
const MIN_AIM = -70;
const MAX_AIM = 70;
const BALL_SPEED = 20;
const BALL_DIAMETER: Pixels = 60;
const BALL_RADIUS: Pixels = BALL_DIAMETER / 2;
const GRID_COLUMNS = 8;
const GRID_ROWS = 12;
const GRID_COLUMN_WIDTH = BALL_DIAMETER;
const GRID_ROW_OVERLAP = BALL_RADIUS * Math.cos(PI/4) / 2;
const GRID_ROW_HEIGHT = BALL_RADIUS + GRID_ROW_OVERLAP * 2;
const GRID_WIDTH: Pixels = GRID_COLUMN_WIDTH * (GRID_COLUMNS + 0.5);
const GRID_HEIGHT: Pixels = GRID_ROW_HEIGHT * GRID_ROWS;
const BALL_BORDER: Pixels = 2;

console.log({ MIN_AIM, MAX_AIM });

const enum BallType {
    red,
    green,
    blue,
    yellow,
    helper,
    foe,
}

const enum BallStatus {
    queued,
    ready,
    chucked,
    snapping,
    snapped,
    capturing,
    caught,
    dropping,
    killed,
    finished,
}

const MS_TO_DISAPPEAR = {
    [BallStatus.capturing]: 500,
    [BallStatus.caught]: 500,
    [BallStatus.dropping]: 500,
    [BallStatus.killed]: 500,
}
const FRAMES_TO_DISAPPEAR: typeof MS_TO_DISAPPEAR =
    Object.keys( MS_TO_DISAPPEAR )
          .reduce( (obj,key) => {
              obj[key] = Math.round( MS_TO_DISAPPEAR[key] / 1000 * FPS );
              return obj;
          }, {} );