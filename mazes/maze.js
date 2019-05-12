#!/usr/local/bin/node

function upTo(n) {
  return Array(n).fill().keys()
}

function pickOne(arr) {
  return arr.splice(Math.floor( arr.length * Math.random() ), 1)[0];
}

const Dir = {
  NORTH: { value: 1, rvalue: 4, dx:  0, dy: -1 },
  EAST : { value: 2, rvalue: 8, dx:  1, dy:  0 },
  SOUTH: { value: 4, rvalue: 1, dx:  0, dy:  1 },
  WEST : { value: 8, rvalue: 2, dx: -1, dy:  0 },
};

class Maze {
  constructor(width, height) {
    this.width  = width;
    this.height = height;
    this.maxX   = width  - 1;
    this.maxY   = height - 1;

    this.grid = Array.from( Array(height), x => Array(width).fill(0))
  }

  asString () {
    return this.grid.map(row => row.join(" ")).join("\n");
  }

  isValidXY(x, y) {
    return(x >= 0 && x < this.width && y >= 0 && y < this.height);
  }

  randomPoint () {
    return {
      x: Math.floor( Math.random() * this.width ),
      y: Math.floor( Math.random() * this.height ),
    };
  }

  link (x, y, direction) {
    // console.log(`linking ${x},${y} in ${direction.value}`);
    this.grid[y][x] |= direction.value;

    let tx = x + direction.dx;
    let ty = y + direction.dy;

    if (this.isValidXY(tx, ty)) {
      this.grid[ty][tx] |= direction.rvalue;
    }
  }

  eachCell (fn) {
    for (const y of upTo(maze.height)) {
      for (const x of upTo(maze.width)) {
        fn(x,y);
      }
    }
  }

  edgeCells () {
    const xs = Array.from(upTo(this.maxX));
    const ys = Array.from(upTo(this.maxY));

    let cells = xs.map(x => { return { x: x, y: 0         }; }).concat(
                xs.map(x => { return { x: x, y: this.maxY }; })).concat(
                ys.map(y => { return { x: 0, y: y         }; })).concat(
                ys.map(y => { return { x: this.maxX, y: y }; }));

    return cells;
  }

  applyBT () {
    this.eachCell( (x, y) => {
      let options = [ Dir.SOUTH, Dir.EAST ].filter(
        dir => this.isValidXY(x + dir.dx, y + dir.dy)
      );

      if (options.length > 0) {
        this.link(x, y, pickOne(options))
      }
    })
  }

  applySidewinder () {
    let run   = [];
    let east  = Dir.EAST;
    let north = Dir.NORTH;

    this.eachCell( (x,y) => {
      run.push({ x: x, y: y });

      // If possible, half the time drill east.
      if (
        this.isValidXY(x + east.dx, y + east.dy)
        &&
        (y == 0 || Math.random() > 0.5)
      ) {
        this.link(x, y, east);
        return;
      }

      if (y != 0) {
        // Otherwise, of the current run, pick one, drill north, and end the
        // run.
        const cell = pickOne(run);
        this.link(cell.x, cell.y, north);
        run = [];
      }
    });
  }

  addExits(n) {
    let edges = this.edgeCells();

    if (n > edges.length) {
      // This isn't quite fair.  The corners could count double.  But I can come
      // back and do that later. -- rjbs, 2019-05-11
      throw "too many exits requested";
    }

    for (const i of upTo(n)) {
      const cell = pickOne(edges);

      let options = [];

      if (cell.y == 0)          options.push( Dir.NORTH )
      if (cell.y == this.maxY)  options.push( Dir.SOUTH )
      if (cell.x == 0)          options.push( Dir.WEST  )
      if (cell.x == this.maxX)  options.push( Dir.EAST  )

      let dir = pickOne(options);
      this.link(cell.x, cell.y, dir);
    }
  }
}

let maze = new Maze(8, 8);

// maze.applyBT();
maze.applySidewinder();
maze.addExits(2);

console.log( maze.asString() );
