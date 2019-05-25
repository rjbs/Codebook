#!/usr/local/bin/node

const DEBUG = 0;

function upTo(n) {
  return Array(n).keys()
}

function pickOne(arr) {
  return arr.splice(Math.floor( arr.length * Math.random() ), 1)[0];
}

const Dir = {
  north: { value: 1, dx:  0, dy: -1, name: 'north' },
  east : { value: 2, dx:  1, dy:  0, name: 'east'  },
  south: { value: 4, dx:  0, dy:  1, name: 'south' },
  west : { value: 8, dx: -1, dy:  0, name: 'west'  },
};

Dir.north.opposite = Dir.south;
Dir.east.opposite  = Dir.west;
Dir.south.opposite = Dir.north;
Dir.west.opposite  = Dir.east;

const wallCharacter = {};
wallCharacter[  0 | 0 | 0 | 0 ] = ' ';
wallCharacter[  0 | 0 | 0 | 8 ] = '╴';
wallCharacter[  0 | 0 | 4 | 0 ] = '╷';
wallCharacter[  0 | 0 | 4 | 8 ] = '┐';
wallCharacter[  0 | 2 | 0 | 0 ] = '╶';
wallCharacter[  0 | 2 | 0 | 8 ] = '─';
wallCharacter[  0 | 2 | 4 | 0 ] = '┌';
wallCharacter[  0 | 2 | 4 | 8 ] = '┬';
wallCharacter[  1 | 0 | 0 | 0 ] = '╵';
wallCharacter[  1 | 0 | 0 | 8 ] = '┘';
wallCharacter[  1 | 0 | 4 | 0 ] = '│';
wallCharacter[  1 | 0 | 4 | 8 ] = '┤';
wallCharacter[  1 | 2 | 0 | 0 ] = '└';
wallCharacter[  1 | 2 | 0 | 8 ] = '┴';
wallCharacter[  1 | 2 | 4 | 0 ] = '├';
wallCharacter[  1 | 2 | 4 | 8 ] = '┼';

class Cell {
  constructor (x, y, maze) {
    this.x     = x;
    this.y     = y;
    this.maze  = maze;
    this.mark  = null;
    this.links = { north: false, east: false, south: false, west: false };
  }

  setMark (str) {
    str = String(str);

    this.mark = str.length  > 3 ? "XXX"
              : str.length == 3 ? str
              : str.length == 2 ? (" " + str)
              : str.length == 1 ? (" " + str + " ")
              :                   "   ";
  }

  clearMark () {
    this.mark = null;
  }

  linksNorth () { return this.links.north }
  linksEast  () { return this.links.east  }
  linksSouth () { return this.links.south }
  linksWest  () { return this.links.west  }

  numericValue () {
    return( (this.links.north ? 1 : 0)
          | (this.links.east  ? 2 : 0)
          | (this.links.south ? 4 : 0)
          | (this.links.west  ? 8 : 0) );
  }

  neighbors () {
    let neighbor = {};

    for (const dirName of Object.keys(Dir)) {
      const cell = this.maze.cellAt(
        this.x + Dir[dirName].dx,
        this.y + Dir[dirName].dy,
      );

      if (cell) neighbor[dirName] = cell;
    }

    return neighbor;
  }

  unlinkedNeighbors () {
    const neighbors = this.neighbors();
    return Object.keys(neighbors)
                 .filter(d => ! this.links[d])
                 // I'm not thrilled by this syntax. -- rjbs
                 .reduce((acc, d) => (acc[d] = neighbors[d], acc), {});
  }

  neighborLinks () {
    const neighbors = this.neighbors();
    return Object.keys(neighbors)
                 .filter(d => this.links[d])
                 // I'm not thrilled by this syntax. -- rjbs
                 .reduce((acc, d) => (acc[d] = neighbors[d], acc), {});
  }
};

class Maze {
  constructor(width, height) {
    this.width  = width;
    this.height = height;
    this.maxX   = width  - 1;
    this.maxY   = height - 1;

    this.grid = Array.from(
      upTo(height),
      y => Array.from( upTo(width), x => new Cell(x, y, this))
    )
  }

  asNumberGrid () {
    return this.grid
               .map(row => row.map(cell => cell.numericValue()).join(" "))
               .join("\n");
  }

  cellAt (x, y) {
    if (x < 0 || y < 0) return null;
    if (x > this.maxX || y > this.maxY) return null;

    return this.grid[y][x];
  }

  wall (n, e, s, w) {
    return wallCharacter[ (n ? 1 : 0)
                        | (e ? 2 : 0)
                        | (s ? 4 : 0)
                        | (w ? 8 : 0) ];
  }

  asString () {
    let output = "";

    for (const y of upTo(this.height + 1)) {
      let row = "";
      let filler = "";

      for (const x of upTo(this.width + 1)) {
        const ne = this.cellAt(x    , y - 1);
        const se = this.cellAt(x    , y    );
        const sw = this.cellAt(x - 1, y    );
        const nw = this.cellAt(x - 1, y - 1);

        const n = (ne !== null && ! (ne.linksWest()  ))
               || (nw !== null && ! (nw.linksEast()  ));
        const e = (se !== null && ! (se.linksNorth() ))
               || (ne !== null && ! (ne.linksSouth() ));
        const s = (se !== null && ! (se.linksWest()  ))
               || (sw !== null && ! (sw.linksEast()  ));
        const w = (sw !== null && ! (sw.linksNorth() ))
               || (nw !== null && ! (nw.linksSouth() ));

        if (DEBUG) {
          const b = b => b ? 1 : 0;
          console.log(
            "(%d, %d) -> NE:%s SE:%s SW:%s NW:%s -> (n:%s e:%s s:%s w:%s) -> %s",
            x, y,
            ne, se, sw, nw,
            b(n), b(e), b(s), b(w),
            this.wall(n, e, s, w)
          );
        }

        row += this.wall(n, e, s, w);

        if (x > this.maxX) {
          // The rightmost wall is just the right joiner.
          filler +=  this.wall(s, 0, s, 0);
        } else {
          // Every wall but the last gets post-wall spacing.
          row += (e ? this.wall(0,1,0,1) : ' ').repeat(3);
          filler +=  this.wall(s, 0, s, 0);

          filler += (se && se.mark !== null ? se.mark : '   ');
        }
      }

      output += row + "\n";

      if (y <= this.maxY) {
        output += filler.repeat(1) + "\n";
      }
    }

    return output;
  }

  isValidXY(x, y) {
    return(x >= 0 && x < this.width && y >= 0 && y < this.height);
  }

  randomCell () {
    return this.cellAt(
      Math.floor( Math.random() * this.width ),
      Math.floor( Math.random() * this.height ),
    );
  }

  link (from, direction) {
    this.grid[from.y][from.x].links[ direction.name ] = true;

    let tx = from.x + direction.dx;
    let ty = from.y + direction.dy;

    if (this.isValidXY(tx, ty)) {
      this.cellAt(tx,ty).links[ direction.opposite.name ] = true;
    }
  }

  allCells () {
    return this.grid.flat(1);
  }

  eachCell (fn) {
    for (const y of upTo(maze.height)) {
      for (const x of upTo(maze.width)) {
        fn(this.cellAt(x,y));
      }
    }
  }

  edgeCells () {
    const xs = Array.from(upTo(this.maxX));
    const ys = Array.from(upTo(this.maxY));

    let cells = xs.map(x => this.cellAt(x, 0         )).concat(
                xs.map(x => this.cellAt(x, this.maxY))).concat(
                ys.map(y => this.cellAt(0, y        ))).concat(
                ys.map(y => this.cellAt(this.maxX, y)));

    return cells;
  }

  apply_bt () {
    this.eachCell(cell => {
      let options = [ Dir.south, Dir.east ].filter(
        dir => this.isValidXY(cell.x + dir.dx, cell.y + dir.dy)
      );

      if (options.length > 0) {
        this.link(cell, pickOne(options))
      }
    })
  }

  apply_sidewinder () {
    let run   = [];
    let east  = Dir.east;
    let south = Dir.south;

    this.eachCell(cell => {
      if (cell.y != this.maxY) run.push(cell);

      // If possible, half the time drill east.
      if (
        this.isValidXY(cell.x + east.dx, cell.y + east.dy)
        &&
        (cell.y == this.maxY || Math.random() > 0.5)
      ) {
        this.link(cell, east);
        return;
      }

      if (run.length) {
        // Otherwise, of the current run, pick one, drill north, and end the
        // run.
        const cell = pickOne(run);
        this.link(cell, south);
        run = [];
        return;
      }

    });
  }

  apply_ab () {
    let visited = new Map();

    const root = this.randomCell();
    let cell = root;

    while (visited.size < this.height * this.width) {
      visited.set(cell, true);

      const paths  = cell.neighbors();
      const dir    = pickOne( Object.keys( paths ) );
      const target = paths[dir];

      if (! visited.has(target)) {
        maze.link(cell, Dir[dir]);

        let mark = Dir[dir].opposite.name.substr(0,1);
      }

      cell = paths[dir];
    }
  }

  apply_wilson () {
    let unvisited = new Map();

    for (const c of this.allCells()) {
      unvisited.set(c, true);
    }

    unvisited.delete( this.randomCell() );

    while (unvisited.size > 0) {
      const path = new Map();

      // pick a random unvisited cell
      let curr = pickOne([...unvisited.keys()]);

      while (true) {
        // pick a neighbor of cell
        const [ nextDir, nextCell ] = pickOne(Object.entries(curr.neighbors()));

        // if cell is already in path, start over
        if ([...path.keys()].find(c => c === nextCell)) break;

        path.set(curr, nextDir);

        // if cell is visited, commit path and start over
        if (! unvisited.has(nextCell)) {
          for (const [ from, dir ] of path.entries()) {
            this.link(from, Dir[dir]);
            unvisited.delete(from);
          }

          break;
        }

        // cell was unvisited and not in path; keep walking
        curr = nextCell;
      }
    }
  }

  apply_hk () {
    let unvisited = new Map();

    for (const c of this.allCells()) {
      unvisited.set(c, Object.entries(c.neighbors()));
    }

    // pick a random unvisited cell
    let curr = pickOne([...unvisited.keys()]);
    unvisited.delete(curr);

    while (unvisited.size > 0) {
      // pick a neighbor of cell
      let options = Object.entries(curr.neighbors())
                          .filter(([ d, c ]) => unvisited.has(c));

      if (options.length > 0) {
        const [ nextDir, nextCell ] = pickOne(options);

        this.link(curr, Dir[nextDir]);
        unvisited.delete(nextCell);
        curr = nextCell;

        continue;
      }

      // Find the first unvisited cell C with a visited neighbor N.
      // Link C to N, then continue walking from C.
      let [ nextCell, targets ] = [...unvisited.entries()]
        .map(([c,n]) => [ c, n.filter(([d,t]) => ! unvisited.has(t)) ])
        .find(([c,n]) => n.length > 0);

      this.link(nextCell, Dir[pickOne(targets)[0]]);
      unvisited.delete(nextCell);

      curr = nextCell;
    }
  }

  apply_rback () {
    let cells = this.allCells();

    let stack = [ pickOne(cells) ];

    let unvisited = new Set(cells);

    while (unvisited.size > 0) {
      let next = stack[ stack.length - 1 ];

      let options = Object.entries(next.unlinkedNeighbors())
                          .filter(e => unvisited.has(e[1]));

      if (options.length) {
        const [ dir, target ] = pickOne(options);
        this.link(next, Dir[dir]);
        unvisited.delete(target);
        stack.push(target);

        continue;
      }

      stack.pop();
    }

  }

  addExits(n) {
    let edges = this.edgeCells();

    if (n > edges.length) {
      // This isn't quite fair.  The corners could count double.  But I can come
      // back and do that later. -- rjbs, 2019-05-11
      throw "too many exits requested";
    }

    var exitCells = [];

    for (const i of upTo(n)) {
      const cell = pickOne(edges);

      let options = [];

      if (cell.y == 0)          options.push( Dir.north )
      if (cell.y == this.maxY)  options.push( Dir.south )
      if (cell.x == 0)          options.push( Dir.west  )
      if (cell.x == this.maxX)  options.push( Dir.east  )

      let dir = pickOne(options);
      this.link(cell, dir);

      exitCells.push( this.cellAt(cell.x, cell.y) );
    }

    return exitCells;
  }

  markPath (start, end) {
    let d = new Distance(this, end);
    let next = start;

    while (next) {
      const n = d.distanceTo(next);
      next.setMark(n);

      next = Object.values(next.neighborLinks())
                   .filter(c => d.distanceTo(c) < n)[0]
    }
  }
}

class Distance {
  constructor (maze, root) {
    this.maze = maze;
    this.root = root;

    this.distances = new Map();

    let queue = [ root ];
    let distance = 0;
    while (queue.length) {
      queue.forEach(c => this.distances.set(c, distance));
      queue = queue
        .flatMap(c => Object.values(c.neighborLinks())
                            .filter(n => ! this.distances.has(n)));

      distance += 1;
    }
  }

  distanceTo (cell) {
    return this.distances.get(cell);
  }
}

//----------------------------------

let algo = process.argv[2] || 'ab';

let maze = new Maze(15, 15);

if (maze["apply_" + algo]) {
  maze["apply_" + algo]();
} else {
  console.error(`do not know how to use ${algo} algorithm`);
  process.exit(1);
}

let [ start, end ] = maze.addExits(2);
maze.markPath(start, end);

console.log( maze.asString() );
