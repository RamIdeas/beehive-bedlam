
class Ball {

    static z = 1e7;

    static randomType() {
        return Math.random() < 0.9
             ? <BallType> randomInt(0,3)
             : Math.random() < 0.5
             ? BallType.helper
             : BallType.foe;
    }
    
    static isTypeFunctions = new Map<BallType,(b: Ball) => boolean>();
    static isTypeFn( type: BallType ) {
        let fn = Ball.isTypeFunctions.get( type );
        if( !fn ) {
            fn = function(ball) { return ball.type === type }
            Ball.isTypeFunctions.set( type, fn );
        }
        return fn;
    }
    static isStatusFunctions = new Map<BallStatus,(b: Ball) => boolean>();
    static isStatusFn( status: BallStatus ) {
        let fn = Ball.isStatusFunctions.get( status );
        if( !fn ) {
            fn = function(ball) { return ball.status === status }
            Ball.isStatusFunctions.set( status, fn );
        }
        return fn;
    }
    static isTopRow( ball: Ball ) {
        return ball.snap && ball.snap.row === GRID_ROWS - 1;
    }

    el: HTMLElement;
    created: Time = NOW();
    x = 0;
    y = 0;
    dx = 0;
    dy = 0;
    status = BallStatus.queued;
    impactMultiplier: number;
    capturingMultiplier: number;
    snap?: { row: number, col: number, x: number, y: number };
    disappearanceFrame = 0;
    balls = {
        caught: <Ball[]> [],
        killed: <Ball[]> [],
        dropped: <Ball[]> [],
    }

    constructor( public type = Ball.randomType() ) {
        
        this.impactMultiplier = this.isSpecialType() ? 1 : 0.8;
        this.capturingMultiplier = this.type === BallType.helper
                                 ? 3
                                 : this.type == BallType.foe
                                 ? 2
                                 : 0;
        
        this.createDOM();
        this.updateDOM();
    }

    createDOM() {
        this.el = document.createElement('div');
        this.el.classList.add('ball');
        Object.assign( this.el.style, {
            top: -BALL_RADIUS + 'px',
            left: -BALL_RADIUS + 'px',
            width: BALL_DIAMETER + 'px',
            height: BALL_DIAMETER + 'px',
            backgroundColor: {
                [BallType.red]: 'red',
                [BallType.green]: 'green',
                [BallType.blue]: 'blue',
                [BallType.yellow]: 'yellow',
                [BallType.helper]: 'white',
                [BallType.foe]: 'black',
            }[ this.type ],
            zIndex: Ball.z--,
        });
        state.grid.appendChild( this.el );
    }

    update( frameRateRatio = 1 ) {

        switch( this.status ) {
            
            case BallStatus.chucked: {

                this.applyVelocity( frameRateRatio );

                const distanceToWall = GRID_WIDTH/2 - Math.abs(this.x) - BALL_RADIUS;
                if( distanceToWall <= Number.EPSILON ) {
                    const newFrameRateRatio = Math.abs( distanceToWall / this.dx ) * frameRateRatio;
                    this.applyVelocity( -newFrameRateRatio ); // rewind
                    this.dx *= -1;
                    this.applyVelocity( 1 - newFrameRateRatio ); // forward
                }

                const impacted = state.balls.filter( Ball.isStatusFn(BallStatus.snapped) )
                                            .filter( this.didImpact, this )
                                         // .filter( this.isNotThis, this );
                
                let newFrameRateRatio = 0;
                const distanceToTop = GRID_HEIGHT - this.y - BALL_RADIUS;
                if( impacted.length ) {
                    type Vec2 = [number, number];
                    const abs = (x: Vec2) => distance( x[0], x[1] );
                    const dot = (x: Vec2, y: Vec2) => x.reduce( (sum,_,i) => sum + x[i] * y[i], 0 );
                    
                    // impacted.map( ball => ({ ball, distance: distance(this.x - ball.x, this.y - ball.y) }) )
                    //         .sort( (a,b) => a.distance - b.distance )
                    //         .map( x => x.ball );

                    const x: Vec2 = [ this.dx, this.dy ];
                    const y: Vec2 = [ impacted[0].x - this.x, impacted[0].y - this.y ];
                    const z = <Vec2> x.map( (_,i) => x[i] + y[i] );
                    const A = Math.acos( dot(x,y) / (abs(x) * abs(y)) );
                    const C = Math.acos( dot(y,z) / (abs(y) * abs(z)) );
                    const w = BALL_DIAMETER * Math.sin(C) / Math.sin(A);

                    newFrameRateRatio = w / BALL_SPEED;
                }
                else if( distanceToTop <= Number.EPSILON ) {
                    newFrameRateRatio = Math.abs( distanceToTop / this.dy ) * frameRateRatio;
                }
                else {
                    break;
                }

                this.applyVelocity( -newFrameRateRatio ); // rewind
                this.isSpecialType() ? this.capture() : this.beginSnap( 1 - newFrameRateRatio );
                this.update( 1 - newFrameRateRatio ); // forward

                break;
            }
            case BallStatus.snapping: {

                this.applyVelocity( frameRateRatio );

                const { x, y } = this.snap;
                const dist = distance( this.x - x, this.y - y );
                if( dist < 1 ) {// < Number.EPSILON
                    this.endSnap();
                }

                break;
            }
            case BallStatus.capturing: {

                const disappearanceFactor = this.nextDisappearanceFactor( frameRateRatio );

                const impacted = state.balls.filter( Ball.isStatusFn(BallStatus.snapped) )
                                            .filter( this.didImpact, this );

                if( impacted.length ) {
                    
                    const catchOrKill = this.type === BallType.helper
                                      ? ball => ball.catch()
                                      : ball => ball.kill();

                    impacted.forEach( catchOrKill );
                }

                if( disappearanceFactor > 1 ) {
                    this.finish();
                }

                break;
            }
            case BallStatus.caught: {

                if( this.nextDisappearanceFactor(frameRateRatio) > 1 ) {
                    this.finish();
                }

                break;
            }
            case BallStatus.killed: {

                if( this.nextDisappearanceFactor(frameRateRatio) > 1 ) {
                    this.finish();
                }

                break;
            }
            case BallStatus.dropping: {
             
                const disappearanceFactor = this.nextDisappearanceFactor( frameRateRatio );

                if( disappearanceFactor <= 1 ) {
                    this.dy = Math.cos( disappearanceFactor * Math.PI ) * BALL_SPEED;
                    this.dx = (Math.sign(this.dx || random(-1,1)) ) * BALL_SPEED / 4 * (1 - disappearanceFactor) ** 2;
                }

                this.applyVelocity( frameRateRatio );

                if( this.y <= -BALL_RADIUS ) {
                    this.finish();
                }

                break;
            }
        }
    }

    private _style: any = {};
    updateDOM() {
        const xy = toDomXY( this.x, this.y ).map( xy => xy + 'px' );

        const style: any = {
            transform: `translate(${ xy.join() })`,
        }

        switch( this.status ) {
            case BallStatus.caught: {
                style.opacity = (1 - this.getDisappearanceFactor()).toFixed(3);
                break;
            }
            case BallStatus.killed: {
                style.opacity = (1 - this.getDisappearanceFactor()).toFixed(3);
                break;
            }
            case BallStatus.capturing: {
                const scale = (this.capturingMultiplier - 1) * this.getDisappearanceFactor() + 1;
                style.transform += ` scale(${ scale })`;
                style.opacity = (1 - this.getDisappearanceFactor() ** 2).toFixed(3);
                break;
            }
            case BallStatus.finished: {
                this.el.remove();
                break;
            }
        }

        const changes = this._style.transform !== style.transform
                     || this._style.opacity !== style.opacity;
        if( changes ) {
            this._style = style;
            Object.assign( this.el.style, style );
        }
    }

    chuck( angle: number ) {
        this.status = BallStatus.chucked;

        const theta = (90 - Math.abs(angle)) * Math.PI/180;
        this.dx = Math.cos(theta) * BALL_SPEED * Math.sign(angle);
        this.dy = Math.sin(theta) * BALL_SPEED;
    }

    getScore() {
        const { caught, killed, dropped } = this.balls;
        const combo = caught.concat( dropped );
        const scores = [
            caught.length * 100,
            killed.length * -100,
            dropped.length * 75,
            ...[ BallType.red, BallType.green, BallType.blue, BallType.yellow ]
              .map( type => combo.filter( Ball.isTypeFn(type) ).length )
              .map( length => length <= 1 ? 0 : 25 * (length - 1) )
        ];
        return scores.reduce( (sum,x) => sum + x, 0 )
    }

    private applyVelocity( frameRateRatio: number ) {
        this.x += this.dx * frameRateRatio;
        this.y += this.dy * frameRateRatio;
    }

    private beginSnap( frameRateRatio: number ) {
        this.status = BallStatus.snapping;

        let row = Math.floor( this.y / GRID_ROW_HEIGHT );
        const colOffset: Pixels = BALL_RADIUS * (row % 2 ? 0 : 1);
        let col = Math.floor( (this.x + GRID_WIDTH/2 - colOffset) / GRID_COLUMN_WIDTH );
        
        row = clamp( row, 0, GRID_ROWS - 1 );
        col = clamp( col, 0, GRID_COLUMNS - 1 );

        const x = col * GRID_COLUMN_WIDTH + BALL_RADIUS + colOffset - GRID_WIDTH/2;
        const y = row * GRID_ROW_HEIGHT + BALL_RADIUS;
        const dist = distance( this.x - x, this.y - y );
        const steps = Math.max( 4, Math.round(dist / BALL_SPEED) ) + frameRateRatio;
        
        this.dx = (x - this.x) / steps;
        this.dy = (y - this.y) / steps;
        this.snap = { row, col, x, y };
    }

    private endSnap() {
        this.status = BallStatus.snapped;

        this.x = this.snap.x;
        this.y = this.snap.y;
        this.dx = this.dy = 0;

        // this.impacted = state.balls.filter( this.didImpact, this )
        //                            .filter( this.canInteract, this )
        //                            .filter( this.isNotThis, this );
        
        const interactingNeighbours = this.getNeighbours( true );
        
        if( interactingNeighbours.size > 2 ) {
            interactingNeighbours.forEach( ball => ball.catch() );
            state.someBallsPossiblyFloating = true;
        }
    }
    
    capture() {
        this.status = BallStatus.capturing;
    }
    catch() {
        this.status = BallStatus.caught;

        state.current.balls.caught.push( this );
    }
    kill() {
        this.status = BallStatus.killed;

        state.current.balls.killed.push( this );
    }
    drop() {
        this.status = BallStatus.dropping;

        state.current.balls.dropped.push( this );
    }
    finish() {
        this.status = BallStatus.finished;

        if( this.isSpecialType() ) {
            state.someBallsPossiblyFloating = true;
        }
    }

    private nextDisappearanceFactor( frameRateRatio: number ) {
        this.disappearanceFrame += 1 * frameRateRatio;
        return this.getDisappearanceFactor();
    }
    private getDisappearanceFactor() {
        return this.disappearanceFrame / FRAMES_TO_DISAPPEAR[this.status];
    }

    didImpact( that: Ball ) {
        const scale = this.status === BallStatus.capturing
                    ? (this.capturingMultiplier - 1) * this.getDisappearanceFactor() + 1
                    : this.impactMultiplier;
        const proximity = BALL_RADIUS + BALL_RADIUS * scale;
        return distance( this.x - that.x, this.y - that.y ) <= proximity;
    }
    canInteract( that: Ball ) {
        return this.type === that.type || this.isSpecialType();
    }
    isNotThis( that: Ball ) {
        return this !== that;
    }
    isNeighbour( { snap: that }: Ball ) {
        const { col, row } = this.snap;
        if( this.snap.row === that.row )
            return Math.abs(that.col - col) === 1;
        else if( Math.abs(that.row - row) === 1 )
            return that.col === col || that.col === col + (row % 2 ? -1 : 1);
    }

    getNeighbours( onlyInteracting: boolean, alreadyFound = new Set<Ball>() ) {
        return this.populateNeighbours( alreadyFound, state.ballsMap, onlyInteracting );
    }
    private populateNeighbours( neighbours: Set<Ball>, coordMap: Map<string,Ball>, onlyInteracting: boolean ) {
        neighbours.add( this );
        for( let coord of this.getNeighbourCoOrds() ) {
            const next = coordMap.get(coord);
            if( !next || neighbours.has(next) ) continue;
            if( onlyInteracting && !this.canInteract(next) ) continue;
            next.populateNeighbours( neighbours, coordMap, onlyInteracting );
        }
        return neighbours;
    }
    private getNeighbourCoOrds() {
        const { row, col } = this.snap;
        const shift = row % 2 ? -1 : 1;
        return [
            [ col - 1,     row     ],
            [ col + 1,     row     ],
            [ col,         row - 1 ],
            [ col,         row + 1 ],
            [ col + shift, row - 1 ],
            [ col + shift, row + 1 ],
        ].map( coords => coords.join() );
    }

    isSpecialType() {
        return this.type === BallType.helper || this.type === BallType.foe;
    }
    isColourType() {
        return !this.isSpecialType();
    }

    isNotActing() {
        return !this.isActing();
    }
    isActing() {
        switch( this.status ) {
            case BallStatus.ready:
            case BallStatus.chucked:
            case BallStatus.snapping:
            case BallStatus.capturing:
            case BallStatus.caught:
                return true;
            case BallStatus.queued:
            case BallStatus.snapped:
            case BallStatus.dropping:
            case BallStatus.killed:
            case BallStatus.finished:
                return false;
        }
    }
}
