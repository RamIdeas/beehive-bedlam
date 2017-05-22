
const state = new class State {

    aim: number = 0;
    balls: Ball[] = [];
    queue: Ball[] = [];
    get current() { return state.queue[0] }
    score = 0;
    level = 0;
    timer: Time;

    start: Time;
    time: Time;

    grid: HTMLElement;
    fpsCounter: HTMLElement;
    scoreCounter: HTMLElement;

    someBallsPossiblyFloating: boolean;

    setup() {
        // state.start = state.time = now;

        const shell = $('.shell');
        const container = $('.grid-container');
        const grid = state.grid = $('.grid');

        Object.assign( container.style, {
            paddingTop: GRID_ROW_OVERLAP + 'px',
            borderWidth: '1em 1em 0',
            borderStyle: 'solid',
            borderColor: '#652a00',
        });
        Object.assign( grid.style, {
            width: GRID_WIDTH + 'px',
            height: GRID_HEIGHT + 'px',
        });
        
        // const { clientWidth: shellWidth, clientHeight: shellHeight } = shell;
        // const shellAspectRatio = shellWidth / shellHeight;
        // let scale;
        // if( shellAspectRatio < 9/16 ) { // contrained by width
        //     scale = shellWidth / GRID_WIDTH;
        // }
        // else { // contrained by height
        //     scale = shellHeight / GRID_HEIGHT;
        // }
        // grid.style.transform = `scale(${ scale })`;
        drawGrid();

        for( let i = 0; i < 5; i++ )
            state.queue.push( new Ball() );
        state.current.status = BallStatus.ready;

        requestAnimationFrame( state.update );

        grid.addEventListener( 'click', e => {
            if( state.current.status === BallStatus.ready ) {
                const { pageX, pageY } = e;
                const { top: originX, left: originY } = grid.getBoundingClientRect();
                const x = pageX - originX;
                const y = pageY - originY;
                const [ dx, dy ] = toGameXY(x,y);
                const theta = Math.atan( dx / dy );
                const angle = Math.round( theta * 180/PI );
                state.aim = clamp( angle, MIN_AIM, MAX_AIM);
                state.current.chuck( state.aim );
            }
        });

        state.fpsCounter = document.createElement('div');
        state.fpsCounter.style.position = 'absolute';
        state.fpsCounter.style.top = '0';
        state.fpsCounter.style.left = '0';
        state.fpsCounter.style.fontSize = '3em';
        document.body.appendChild( state.fpsCounter );

        state.scoreCounter = document.createElement('div');
        state.scoreCounter.style.position = 'absolute';
        state.scoreCounter.style.top = '0';
        state.scoreCounter.style.right = '0';
        state.scoreCounter.style.fontSize = '3em';
        document.body.appendChild( state.scoreCounter );
    }

    update() {

        const start = NOW();

        let { queue, balls, current } = state;

        const allBalls = queue.concat( balls );
        allBalls.forEach( ball => ball.update() );
        allBalls.forEach( ball => ball.updateDOM() );

        state.balls = balls = balls.filter( ball => ball.status !== BallStatus.finished );

        if( state.someBallsPossiblyFloating ) {
            state.dropFloaters();
            state.someBallsPossiblyFloating = false;
        }

        if( current && current.isNotActing() ) {
            console.log( '+', current.getScore() );
            state.score += current.getScore();

            queue.push( new Ball() );
            balls.push( queue.shift() );
            current = state.current;
            current.status = BallStatus.ready;
        }

        requestAnimationFrame( state.update );

        const end = NOW();
        const time = end - start;

        state.fpsCounter.innerText = time.toFixed(2) + 'ms';
        state.scoreCounter.innerText = `Score: ${ state.score + current.getScore() }`;
    }

    getBallsChainedToTop() {
        const topRow = state.balls.filter( Ball.isStatusFn(BallStatus.snapped) )
                                  .filter( Ball.isTopRow );
        const chain = new Set<Ball>();
        for( let ball of topRow ) {
            if( chain.has(ball) ) continue;
            ball.getNeighbours( false, chain );
        }
        return chain;
    }
    dropFloaters() {
        const snapped = state.balls.filter( Ball.isStatusFn(BallStatus.snapped) );
        const chained = this.getBallsChainedToTop();
        const floating = snapped.filter( ball => !chained.has(ball) );
        floating.forEach( ball => ball.drop() );
        // console.log(floating);
    }

    private _ballsMapCache: [ Ball[], Map<string,Ball> ];
    get ballsMap() {
        const [ balls, map ] = this._ballsMapCache || <any> [];
        if( state.balls === balls && state.balls.length === balls.length ) return map;
        
        const coordSelector = ball => <[string,Ball]> [ [ball.snap.col, ball.snap.row].join(), ball ];
        const newMap = new Map(
            state.balls.filter( Ball.isStatusFn(BallStatus.snapped) )
                       .map( coordSelector )
        );

        this._ballsMapCache = [ state.balls, newMap ];
        return newMap;
    }
}

