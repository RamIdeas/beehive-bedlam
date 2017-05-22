
requestAnimationFrame( state.setup );

function drawGrid() {

    const grid = $('.grid');
    
    for( let i = 0; i < GRID_ROWS * GRID_COLUMNS; i++ ) {
        
        const slot = document.createElement('div');
        slot.classList.add('slot');

        const row = Math.floor(i / GRID_COLUMNS);
        const col = (i % GRID_COLUMNS);
        const colOffset = row % 2 ? BALL_RADIUS : 0;

        Object.assign( slot.style, {
            position: 'absolute',
            width: BALL_DIAMETER + 'px',
            height: BALL_DIAMETER + 'px',
            boxShadow: '0 0 1px #000 inset',
            top: GRID_ROW_HEIGHT * row - GRID_ROW_OVERLAP + 'px',
            left: GRID_COLUMN_WIDTH * col + colOffset + 'px',
        });

        grid.appendChild(slot);
    }
}