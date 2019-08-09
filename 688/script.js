const TextSpinner = class {
  constructor (text) {
    this.pick = ("0123456789"
              + "abcdefghijklmnopqrstuvwxyz"
              + "ABCDEFGHIJKLMNOPQRSTUVWXYZ").split('');

    this.target  = text;
    this.chars   = text.split('');
    this.hidden  = new Set( this.chars.keys() );
  }

  nextStringState () {
    if (this.hidden.size == 0) return { random: "", found: this.target };

    const randInt   = i => Math.floor( Math.random() * i );
    const getRandom = s => [...s.values()][ randInt(s.size) ];

    if (Math.random() > 0.98) this.hidden.delete( getRandom(this.hidden) );

    let state = {};
    state.random = this.chars.map(
      (c, i) => this.hidden.has(i)
                ? this.pick[ randInt(this.pick.length) ]
                : ' '
    ).join('');

    state.found  = this.chars.map(
      (c, i) => this.hidden.has(i) ? ' ' : c
    ).join('');

    return state;
  }
};

const Animation = class {
  constructor (x, y) {
    this.x = x;
    this.y = y;
  }
}

const SixEightyEight = class {
  constructor () {
    this.width  = 20;
    this.height = 16;
    this.turn   = 1;

    this.player = { x: 2, y: 5 };

    this.mobs   = [];
    this.addRandomMob();

    this.animations = [];

    document.addEventListener("keyup", event => {
      const code = event.code;
      const player = this.player;

      if (code == 'KeyH') { this.takeTurn({ move: { x: -1, y:  0 } }); }
      if (code == 'KeyJ') { this.takeTurn({ move: { x:  0, y: +1 } }); }
      if (code == 'KeyK') { this.takeTurn({ move: { x:  0, y: -1 } }); }
      if (code == 'KeyL') { this.takeTurn({ move: { x: +1, y:  0 } }); }

      if (code == 'KeyW') { this.takeTurn({ move: { x:  0, y: -1 } }); }
      if (code == 'KeyA') { this.takeTurn({ move: { x: -1, y:  0 } }); }
      if (code == 'KeyS') { this.takeTurn({ move: { x:  0, y: +1 } }); }
      if (code == 'KeyD') { this.takeTurn({ move: { x: +1, y:  0 } }); }
    });
  }

  addRandomMob() {
    const newMob = {
      x: Math.floor( Math.random() * 10 ),
      y: Math.floor( Math.random() * 10 ),
      type: (Math.random() > 0.5 ? 'even' : 'odd'),
    };

    this.mobs.push(newMob);
  }

  moveMob (mob, move) {
    const newX = mob.x + move.x;
    const newY = mob.y + move.y;

    // FIXME the "-1" here is bogus, means underlying bug
    mob.x = Math.min(this.width  -1,  Math.max(0, newX));
    mob.y = Math.min(this.height -1,  Math.max(0, newY));
  }

  takeTurn(action) {
    if (action.move) {
      this.moveMob(this.player, action.move);
    }

    this.mobs.forEach(mob => {
      if (mob.x == this.player.x && mob.y == this.player.y) {
        console.log("It dead.");
        mob.isDead = true;

        let ani = new Animation(mob.x, mob.y);
        ani.d = 0;
        ani.draw = (ctx, rect) => {
          ctx.strokeStyle = '#f00';
          ctx.beginPath();
          ctx.arc(
            rect.x1 + ((rect.x2 - rect.x1) / 2),
            rect.y1 + ((rect.y2 - rect.y1) / 2),
            ani.d,
            0,
            2 * Math.PI
          );
          ctx.stroke();
          ani.d += 2;
          if (ani.d > 2 * (rect.x2 - rect.x1)) ani.isDone = true;
        };

        this.animations.push(ani);
      }

      if (mob.isDead) return;

      if (mob.type == 'even' && this.turn % 2 == 0) return;
      if (mob.type == 'odd'  && this.turn % 2 == 1) return;

      const dir  = Math.floor( 4 * Math.random() );
      const move = dir == 0 ? { x: -1, y:  0 }
                 : dir == 1 ? { x:  0, y: +1 }
                 : dir == 2 ? { x:  0, y: -1 }
                 : dir == 3 ? { x: +1, y:  0 }
                 :            undefined; // unreachable

      this.moveMob(mob, move);
    });

    this.mobs = this.mobs.filter(x => ! x.isDead);
    this.animations = this.animations.filter(x => ! x.isDone);

    this.turn++;

    if (this.turn % 37 == 0) {
      this.addRandomMob();
    }
  }
};

const GridRenderer = class {
  constructor (renderer, x1, y1, x2, y2) {
    // So, we got a bounding rectangle, and we know how many grid cells we need
    // it to be both tall and wide.  We want each cell to be a square, so we
    // need to compute the most efficient cell size to get squares inside the
    // available space, then center our subgrid inside the one we were given.
    this.cellSide = Math.min(
      Math.floor((y2 - y1) / renderer.game.height),
      Math.floor((x2 - x1) / renderer.game.width),
    );

    let height = this.cellSide * renderer.game.height;
    let width  = this.cellSide * renderer.game.width;

    // The resulting shape is almost certainly not exactly the same size as the
    // one we were passed.  We want to nudge the corners that we were given
    // inward to match the height and width we've got.  If the difference is
    // odd, we nudge the bottom and left in more.

    {
      const adjHeight = y2 - y1 - height;
      const adjEachY  = Math.floor(adjHeight / 2);
      y1 += adjEachY;
      y2 -= adjEachY;
      if (adjHeight % 2 == 1) y1++;

      const adjWidth  = x2 - x1 - width;
      const adjEachX  = Math.floor(adjWidth / 2);
      x1 += adjEachX;
      x2 -= adjEachX;
      if (adjWidth % 2 == 1) x1++;
    }

    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;

    this.renderer = renderer;
  }

  renderGrid () {
    const renderer = this.renderer;
    var ctx = renderer.canvas.getContext('2d');

    ctx.strokeStyle = '#eee';
    for (let x = 0; x <= this.renderer.game.width; x++) {
      ctx.beginPath();
      ctx.moveTo(this.x1 + x * this.cellSide, this.y1);
      ctx.lineTo(this.x1 + x * this.cellSide, this.y2);
      ctx.stroke()
    }

    for (let y = 0; y <= this.renderer.game.height; y++) {
      ctx.beginPath();
      ctx.moveTo(this.x1, this.y1 + y * this.cellSide);
      ctx.lineTo(this.x2, this.y1 + y * this.cellSide);
      ctx.stroke()
    }

    // The Adventurer
    ctx.strokeStyle = 'orange';
    ctx.fillStyle   = 'purple';

    this.drawGridCircle(renderer.game.player.x, renderer.game.player.y);

    // Mobs
    renderer.game.mobs.forEach(mob => {
      if (mob.isDead) return;

      ctx.strokeStyle = 'orange';
      ctx.fillStyle   = mob.type == 'even' ? 'pink' : 'orange';

      this.drawGridCircle(mob.x, mob.y);
    });

    // Animations
    renderer.game.animations.forEach(ani => {
      if (ani.isDone) return;

      ani.draw(
        this.renderer.canvas.getContext('2d'),
        this.cellRect(ani.x, ani.y),
      );
    });
  }

  cellRect (gridX, gridY) {
    let rect = {
      x1: this.x1 + gridX * this.cellSide,
      y1: this.y1 + gridY * this.cellSide,
    };

    rect.x2 = rect.x1 + this.cellSide - 1;
    rect.y2 = rect.y1 + this.cellSide - 1;

    return rect;
  }

  drawGridCircle (gridX, gridY) {
    const target = this.cellRect(gridX, gridY);

    var ctx = this.renderer.canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(
      target.x1 + ((target.x2 - target.x1) / 2),
      target.y1 + ((target.y2 - target.y1) / 2),
      Math.min(target.x2 - target.x1, target.y2 - target.y1) / 2,
      0,
      2 * Math.PI
    );
    ctx.fill();
  }
}

const Renderer = class {
  constructor (game, canvas) {
    // Consider barfing if canvas not square.
    this.game   = game;
    this.canvas = canvas;

    this.tick   = 0;

    this.spinner = new TextSpinner("Setec Astronomy");

    // We're going to reserve the top 15% of the canvas and the bottom 5%.
    // Also, the left and right 5%
    const x1 = this.canvas.width  * 0.02;
    const y1 = this.canvas.height * 0.15;
    const x2 = this.canvas.width  * 0.98;
    const y2 = this.canvas.height * 0.95;

    this.gridRenderer = new GridRenderer(this, x1, y1, x2, y2);

    window.requestAnimationFrame(this.draw.bind(this));
  }

  draw() {
    this.tick++;

    if (this.canvas.getContext) {
      var ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // The Wonky Blue Line
      ctx.beginPath();
      ctx.strokeStyle = 'blue';
      ctx.moveTo(0, 100);

      const tock = this.tick % 401;
      const dy   = (tock > 200 ? 400 - tock : tock) - 100;
      const dx   = dy / 2;

      ctx.bezierCurveTo(200 + dx, 100 - dy, 300 + dx, 100 + dy, 500, 100);
      ctx.stroke();

      // The Scrambler
      let stringState = this.spinner.nextStringState();
      ctx.font = '48px monospace';

      ctx.fillStyle = 'red';
      ctx.fillText(stringState.random, 35, 50);

      ctx.fillStyle = 'green';
      ctx.fillText(stringState.found, 35, 50);

      this.gridRenderer.renderGrid();

      // Turn Count
      ctx.font = '24px monospace';
      ctx.fillStyle = 'blue';
      ctx.fillText(`turn ${this.game.turn}`, 375, 495);
    }

    window.requestAnimationFrame(this.draw.bind(this));
  }
};

const game  = new SixEightyEight();
const rrr   = new Renderer(game, document.getElementById('canvas'));
