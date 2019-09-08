const TextSpinner = class {
  constructor (canvas, text) {
    this.pick = ("0123456789"
              + "abcdefghijklmnopqrstuvwxyz"
              + "ABCDEFGHIJKLMNOPQRSTUVWXYZ").split('');

    const ctx = canvas.getContext('2d');
    ctx.font = '48px monospace';
    const meas = ctx.measureText(text);

    this.width = meas.width;

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

  render (renderer, ctx) {
    // The Scrambler
    let stringState = this.nextStringState();

    ctx.font = '48px monospace';

    let spinX = (renderer.canvas.width - this.width) / 2;

    ctx.fillStyle = 'red';
    ctx.fillText(stringState.random, spinX, 50);

    ctx.fillStyle = 'green';
    ctx.fillText(stringState.found, spinX, 50);
  }
};

const WubWubLine = class {
  constructor () {
  }

  render (renderer, ctx) {
    // The Wonky Blue Line
    ctx.beginPath();
    ctx.strokeStyle = 'blue';
    ctx.moveTo(0, 45);

    const tock = renderer.tick % 401;
    const dy   = (tock > 200 ? 400 - tock : tock) - 100;
    const dx   = dy / 2;

    ctx.bezierCurveTo(200 + dx, 45 - dy, 300 + dx, 45 + dy, 500, 45);
    ctx.stroke();
  }
}

const TurnCount = class {
  constructor () {
  }

  render (renderer, ctx) {
    // Turn Count
    ctx.font = '24px monospace';
    ctx.fillStyle = 'blue';
    ctx.fillText(`turn ${renderer.game.turn}`, 375, 495);
  }
}

const HealthBar = class {
  constructor () {
  }

  render (renderer, ctx) {
    ctx.translate(10, 475);
    for (let x = 0; x < renderer.game.player.maxHealth; x += 1) {
      ctx.fillStyle = renderer.game.player.health > x ? 'red' : 'grey';
      ctx.fillRect(x * 25, 0, 20, 20);
    }
  }
}

const Animation = class {
  constructor (param) {
    Object.assign(this, param);
  }

  render (grender, ctx) {
    this.draw.call(this, grender, ctx);
  }
}

const Mob = class {
  constructor (game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
  }

  angleToPlayer () {
    const xOffset = this.x - this.game.player.x;
    const yOffset = this.y - this.game.player.y;

    return( 2*Math.PI - Math.atan2(xOffset, yOffset));
  }

  render (grender, ctx) {
    throw ".render() called on abstract Mob";
  }

  moveOptions () {
    return [
      { x: this.x - 1, y: this.y + 0 },
      { x: this.x + 0, y: this.y + 1 },
      { x: this.x + 0, y: this.y - 1 },
      { x: this.x + 1, y: this.y + 0 }
    ].map(m => Object({ action: 'move', x: m.x, y: m.y, cell: this.game.cellInfo(m.x, m.y) }))
     .filter(option => option.cell !== null);
  }

  pickMove () {
    throw ".pickMove() called on abstract Mob";
  }

  takeTurn () {
    if (this.isDead) return;

    // TODO make this a generic "action" kind of thinger?
    const move = this.pickMove(this.game);

    if (move.action === 'wait') return;

    if (move.action === 'attack') {
      this.game.player.takeDamage(1);
      return;
    }

    if (move.action === 'move') {
      // XXX the only reason for the first check is that sometimes we cheat and
      // return x,y with no cell; is that okay? who knows.
      if (move.cell && move.cell.contents) {
        if (move.cell.contents instanceof Player) {
          this.game.player.takeDamage(1);
        }

        return;
      }

      this.x = move.x;
      this.y = move.y;
    }
  }
}

const Roamer = class extends Mob {
  render (grender, ctx) {
    ctx.fillStyle = 'blue';
    grender.drawGridCircle(this, ctx);

    // if (this.type == 'even') ctx.rotate(Math.PI);
    //
    // ctx.rotate(this.angleToPlayer(game));
    // grender.drawGridTriangle(this, ctx);
  }

  pickMove () {
    const moves = this.moveOptions();
    moves.push({ x: this.x, y: this.y });
    return moves[ Math.floor( moves.length * Math.random() ) ];
  }
};

const Seeker = class extends Mob {
  constructor (game, x, y) {
    super(game, x, y);

    this.type = Math.random() > 0.5 ? 'even' : 'odd';
  }

  pickMove () {
    const game = this.game;

    if (this.type == 'even' ^ game.turn % 2 != 0) {
      return { action: 'wait' };
    }

    const moves = this.moveOptions(game);

    const attacks = moves.filter(
      m => m.cell.contents && m.cell.contents instanceof Player
    );

    let move;
    if (attacks.length) {
      move = attacks[ Math.floor(attacks.length * Math.random() ) ];
    } else {
      move = moves.sort((a,b) => {
        let aDist = Math.hypot(a.x - game.player.x, a.y - game.player.y);
        let bDist = Math.hypot(b.x - game.player.x, b.y - game.player.y);

        return(aDist - bDist);
      })[0];
    }

    return move;
  }

  render (grender, ctx) {
    const red = 128 + Math.floor(grender.renderer.tick / 1) % 128;
    ctx.fillStyle = this.type == 'even' ^ this.game.turn % 2 == 0
                  ? `rgb(${red}, 0, 0)`
                  : '#888';

    ctx.rotate(this.angleToPlayer(this.game));
    grender.drawGridTriangle(this, ctx);
  }
};

const Zapper = class extends Mob {
  render (grender, ctx) {
    ctx.fillStyle = '#ee0';
    ctx.strokeStyle = '#303';

    const radius = Math.floor((grender.cellSide - 8) / 2);
    ctx.strokeRect(-radius, -2, 1+2*radius, 5);
    ctx.strokeRect(-2, -radius, 5, 1+2*radius);

    ctx.fillRect(-radius, -2, 1+2*radius, 5);
    ctx.fillRect(-2, -radius, 5, 1+2*radius);
  }

  pickMove () {
    // Given the following positions:   Z   P   Z   Z
    // ...we don't want the player to be attacked twice.  Assuming the leftmost
    // zapper goes first, and enlists the second as its ally, then the second
    // zapper should receive no turn.  The third should find the first
    // unavailable for alliance. didMove is self-set on a zapper when it moves.
    // gotMoved is set on an ally when it's used.  -- rjbs, 2019-09-08
    this.didMove = false;

    if (this.gotMoved) {
      this.gotMoved = false;
      return { action: 'wait' };
    }

    const possibleAllies = [];
    const player = this.game.player;

    for (const mob of this.game.mobs) {
      if ( ! mob instanceof Zapper) continue;
      if (mob.didMove || mob.gotMoved) continue;

      if ( mob.x == this.x
        && mob.x == player.x
        && mob.y != this.y
        && ( (mob.y > player.y && this.y < player.y)
          || (mob.y < player.y && this.y > player.y))
      ) {
        possibleAllies.push(mob);
        continue;
      }

      if ( mob.y == this.y
        && mob.y == player.y
        && mob.x != this.x
        && ( (mob.x > player.x && this.x < player.x)
          || (mob.x < player.x && this.x > player.x))
      ) {
        possibleAllies.push(mob);
        continue;
      }
    }

    if (possibleAllies.length) {
      const ally = possibleAllies[ Math.floor( possibleAllies.length * Math.random() ) ];
      ally.gotMoved = true;
      this.didMove  = true;
      return { action: 'attack' };
    }

    // TODO: move to get into straight line with player
    const moves = this.moveOptions();
    moves.push({ action: 'wait' });
    this.didMove = true;
    return moves[ Math.floor( moves.length * Math.random() ) ];
  }
};

const SixEightyEight = class {
  constructor () {
    this.width  = 20;
    this.height = 16;
    this.turn   = 1;

    this.player = new Player(this);

    this.mobs   = [];
    this.addRandomMob();

    this.animations = [];

    this.actionListener = event => {
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

      if (code == 'Period') { this.takeTurn({ noop: null }); }
    };

    document.addEventListener("keyup", this.actionListener);
  }

  gameOver () {
    document.removeEventListener('keyup', this.actionListener);

    let ani = new Animation({
      draw: function (grender, ctx) {
        ctx.strokeStyle = '#c0c';

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `64px monospace`;
        ctx.fillText('GAME OVER', 250, 250);
      },
    });

    this.animations.push(ani);
  }

  addRandomMob() {
    const mobTypes = [ Roamer, Seeker, Zapper ];
    const type = mobTypes[ Math.floor( Math.random() * mobTypes.length ) ];

    // FIXME this allows double-occupied cells -- rjbs, 2019-08-18
    let newMob = new type(
      this,
      Math.floor( Math.random() * this.width ),
      Math.floor( Math.random() * this.height ),
    );

    this.mobs.push(newMob);
  }

  cellInfo (x, y) {
    if (x < 0 || x >= this.width)  return null;
    if (y < 0 || y >= this.height) return null;

    let cellInfo = { x: y, y: y };

    if (this.player.x === x && this.player.y === y) {
      cellInfo.contents = this.player;
    } else {
      const m = this.mobs.filter(mob => mob.x == x && mob.y == y);
      if (m) cellInfo.contents = m[0];
    }

    return cellInfo;
  }

  moveMob (mob, move) {
    const newX = mob.x + move.x;
    const newY = mob.y + move.y;

    let cell = this.cellInfo(newX, newY);

    if (cell !== null) {
      mob.x = Math.min(this.width  -1,  Math.max(0, newX));
      mob.y = Math.min(this.height -1,  Math.max(0, newY));
    }
  }

  takeTurn(action) {
    if (action.move) {
      this.moveMob(this.player, action.move);
    }

    for (let i = 0; i < this.mobs.length; i++) {
      const mob = this.mobs[i];

      if (mob.x == this.player.x && mob.y == this.player.y) {
        console.log("It dead.");
        mob.isDead = true;

        let ani = new Animation({
          x: mob.x,
          y: mob.y,
          d: 0,
          draw: function (grender, ctx) {
            ctx.strokeStyle = '#f00';
            ctx.beginPath();
            let rect = grender.cellRect(this.x, this.y);
            ctx.arc(0, 0, this.d, 0, 2 * Math.PI);
            ctx.stroke();
            this.d += 2;
            if (this.d > 2 * (rect.x2 - rect.x1)) this.isDone = true;
          },
        });

        this.animations.push(ani);
      }

      mob.takeTurn(this);

      if (this.player.health <= 0) break;
    }

    this.mobs = this.mobs.filter(x => ! x.isDead);
    this.animations = this.animations.filter(x => ! x.isDone);

    this.turn++;

    if (this.turn % 10 == 0) {
      this.addRandomMob();
    }
  }
};

const Player = class {
  constructor (game) {
    this.x = Math.floor( Math.random() * game.width );
    this.y = Math.floor( Math.random() * game.height );

    this.game = game;

    this.maxHealth = 3;
    this.health = this.maxHealth;
  }

  render (grender, ctx) {
    ctx.fillStyle = 'purple';
    grender.drawGridChar(this, ctx, '@');
  }

  takeDamage (n) {
    this.health = Math.max(0, this.health - n);

    let ani = new Animation({
      x: this.x,
      y: this.y,
      d: 0,
      draw: function (grender, ctx) {
        ctx.strokeStyle = '#f0f';
        ctx.beginPath();
        let rect = grender.cellRect(this.x, this.y);
        ctx.arc(0, 0, this.d, 0, 2 * Math.PI);
        ctx.stroke();
        this.d += 2;
        if (this.d > 2 * (rect.x2 - rect.x1)) this.isDone = true;
      },
    });

    this.game.animations.push(ani);

    if (this.health <= 0) this.game.gameOver();
  }
}

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

    this.cellRadius = Math.floor(this.cellSide / 2);

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

    // TODO apply a box crop around the boundaries

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
    this.renderItem(this.renderer.game.player, ctx);

    // Mobs
    renderer.game.mobs.forEach(mob => {
      if (mob.isDead) return;
      this.renderItem(mob, ctx);
    });

    // Animations
    renderer.game.animations.forEach(ani => {
      if (ani.isDone) return;

      this.renderItem(ani, ctx);
    });
  }

  renderItem (item, ctx) {
    ctx.save();
    if (item.x !== undefined && item.y !== undefined) {
      const rect = this.cellRect(item.x, item.y);
      ctx.translate(rect.xmid, rect.ymid);
    }
    item.render(this, ctx);
    ctx.restore();
  }

  cellRect (gridX, gridY) {
    let rect = {
      x1: this.x1 + gridX * this.cellSide,
      y1: this.y1 + gridY * this.cellSide,
    };

    rect.x2 = rect.x1 + this.cellSide - 1;
    rect.y2 = rect.y1 + this.cellSide - 1;

    rect.xmid = rect.x1 + ((rect.x2 - rect.x1) / 2);
    rect.ymid = rect.y1 + ((rect.y2 - rect.y1) / 2);

    return rect;
  }

  drawGridChar (xy, ctx, char) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${this.cellSide}px monospace`;
    ctx.fillText(char, 0, 0);
  }

  drawGridCircle (xy, ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, (this.cellSide / 2) - 2, 0, 2 * Math.PI);
    ctx.fill();
  }

  drawGridTriangle (xy, ctx) {
    ctx.beginPath();

    const radius = 0.80 * this.cellRadius;
    ctx.moveTo(0, - radius);
    ctx.lineTo(  radius, radius);
    ctx.lineTo(- radius, radius);
    ctx.closePath();
    ctx.fill();
  }
}

const GameRenderer = class {
  constructor (game, canvas) {
    // Consider barfing if canvas not square.
    this.game   = game;
    this.canvas = canvas;

    this.tick   = 0;

    this.widgets = [
      new WubWubLine(),
      new TextSpinner(canvas, "System Online"),
      new TurnCount(),
      new HealthBar(),
    ];

    // We're going to reserve the top 15% of the canvas and the bottom 5%.
    // Also, the left and right 5%
    const x1 = this.canvas.width  * 0.02;
    const y1 = this.canvas.height * 0.15;
    const x2 = this.canvas.width  * 0.98;
    const y2 = this.canvas.height * 0.95;

    this.gridRenderer = new GridRenderer(this, x1, y1, x2, y2);

    window.requestAnimationFrame(this.draw.bind(this));
  }

  renderItem (item, ctx) {
    ctx.save();
    item.render(this, ctx);
    ctx.restore();
  }

  draw() {
    this.tick++;

    if (this.canvas.getContext) {
      var ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      this.widgets.forEach(widget => this.renderItem(widget, ctx));

      this.gridRenderer.renderGrid();
    }

    window.requestAnimationFrame(this.draw.bind(this));
  }
};

{
  const g688  = new SixEightyEight();
  const rrr   = new GameRenderer(g688, document.getElementById('canvas'));
}
