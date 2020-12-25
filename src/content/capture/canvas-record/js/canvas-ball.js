const collisionVector = (b1, b2) => {
    const b1Position = b1.position;
    const b2Position = b2.position;
    const b1Velocity = b1.velocity;
    const b2Velocity = b2.velocity;
    const b1PositiomMinusB2Position = b1.position.subtract(b2.position);
    const b1VelocityMinusB2Velocity = b1.velocity.subtract(b2.velocity);
    const multiplyVelocityPosition = b1VelocityMinusB2Velocity.dotProduct(b1PositiomMinusB2Position);

    return b1Velocity.subtract(
        b1PositiomMinusB2Position.multiply(
            b1VelocityMinusB2Velocity.dotProduct(b1PositiomMinusB2Position)/
            (b1PositiomMinusB2Position.magnitude ** 2))
            .multiply((2 * b2.sphereArea)/(b1.sphereArea + b2.sphereArea))
    )
};

class Canvas {
    // init canvas
    constructor(parent = document.body, width = 450, height = 300) {
        this.canvas = document.getElementsByTagName('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        parent.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
    }

    drawCircle(actor) {
        this.ctx.beginPath();
        this.ctx.arc(actor.position.x, actor.position.y, actor.radius, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.fillStyle = actor.color;
        this.ctx.fill();
    }

    drawSquare(obj) {
        this.ctx.beginPath();
        this.ctx.fillStyle = obj.color || "black";
        this.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        // this.ctx.clearRect(45, 45, 60, 60);
        // this.ctx.strokeRect(50, 50, 50, 50);
    }

    drawObstacles(obstacles = []) {
        for (let obstacle of obstacles){
            if(obstacle.type === "square") {
                // console.log(obstacle)
                this.drawSquare(obstacle)
            }
        }
    }

    sync(state, obstacles) {
        this.clearDisplay();
        this.drawObstacles(obstacles);
        this.drawActors(state.actors);
    }

    clearDisplay() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawActors(actors) {
        for (let actor of actors) {
            if (actor.type === 'circle') {
                this.drawCircle(actor);
            }
            // if (actor.type === 'square') {
            //   this.drawSquare(actor);
            // }
        }
    }
}

class Ball {
    constructor(config) {
        Object.assign(this,
            {
                id: Math.floor(Math.random() * 1000000),
                type: 'circle',
                position: new Vector(0, 0),
                velocity: new Vector(0, 0),
                radius: 10,
                color: config && config.color || 'green',
                collisions: [],
            },
            config
        );
    }

    get sphereArea() {
        return Math.PI * this.radius ** 2 // 4 * Math.PI * this.radius ** 2;
    }

    update(state, time, updateId, obstacles) {

        if (this.collisions.length > 10) {
            this.collisions = this.collisions.slice(this.collisions.length - 3);
        }

        const upperLimit = new Vector(
            state.display.canvas.width - this.radius,
            state.display.canvas.height - this.radius
        );
        const lowerLimit = new Vector(0 + this.radius, 0 + this.radius);

        // Check if hitting left or right of display
        if (this.position.x >= state.display.canvas.width - this.radius || this.position.x - this.radius <= 0) {
            this.velocity = new Vector(-this.velocity.x, this.velocity.y);
        }

        // Check if hitting top or bottom of display
        if (this.position.y >= state.display.canvas.height - this.radius || this.position.y - this.radius <= 0) {
            this.velocity = new Vector(this.velocity.x, -this.velocity.y);
        }

        for (let actor of state.actors) {

            /**
             * A ball can't collide with itself and
             * skip balls that have already collided.
             **/
            if (this === actor || this.collisions.includes(actor.id + updateId)) {
                continue;
            }

            const distance = this.position.subtract(actor.position).magnitude;

            if (distance <= this.radius + actor.radius) {
                const v1 = collisionVector(this, actor);
                const v2 = collisionVector(actor, this);
                this.velocity = v1;
                actor.velocity = v2;
                this.collisions.push(actor.id + updateId);
                actor.collisions.push(this.id + updateId);
            }
        }

        for (let obstacle of obstacles) {


            if ((this.position.y /*- this.radius*/ == obstacle.y + obstacle.height || this.position.y /*+ this.radius*/== obstacle.y) && this.position.x >= obstacle.x && this.position.x <= obstacle.x + obstacle.width) {
                this.velocity.bounceY();
                obstacle.color = 'red';
                console.log(obstacle);
            } else { obstacle.color = 'black'; }

            // left right
            if ((this.position.x /*- this.radius*/ == obstacle.x + obstacle.width || this.position.x /*+ this.radius*/ == obstacle.x) && this.position.y >= obstacle.y && this.position.y <= obstacle.y + obstacle.height) {
                this.velocity.bounceX();
                obstacle.color = 'blue';
            } else { obstacle.color = 'black'; }

        }

        const newX = Math.max(
            Math.min(this.position.x + this.velocity.x, upperLimit.x),
            lowerLimit.x
        );

        const newY = Math.max(
            Math.min(this.position.y + this.velocity.y, upperLimit.y),
            lowerLimit.y
        );

        return new Ball({
            ...this,
            position: this.position.add(this.velocity),
        });
    }
}

// interactions of objects
class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    bounceX() {
        this.x = -this.x;
    }

    bounceY() {
        this.y = -this.y;
    }
    add(vector) {
        return new Vector(this.x + vector.x, this.y + vector.y);
    }

    subtract(vector) {
        return new Vector(this.x - vector.x, this.y - vector.y);
    }

    multiply(scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    }

    dotProduct(vector) {
        return this.x * vector.x + this.y * vector.y;
    }

    get magnitude() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }

    get direction() {
        return Math.atan2(this.x, this.y);
    }
}

// update actors and display state
class State {
    constructor(display, actors) {
        this.display = display;
        this.actors = actors;
    }

    update(time, obstacles) {
        const updateId = Math.floor(Math.random() * 1000000);
        const actors = this.actors.map(actor => {
            return actor.update(this, time, updateId, obstacles);
        });
        return new State(this.display, actors);
    }
}

const runAnimation = animation => {
    let lastTime = null;
    const frame = time => {
        if (lastTime !== null) {
            const timeStep = Math.min(100, time - lastTime) / 1000;

            // return false from animation to stop
            if (animation(timeStep) === false) {
                return;
            }
        }
        lastTime = time;
        requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
}

const canvas = new Canvas();
const ball1 = new Ball({
    position: new Vector(290, 50),
    velocity: new Vector(-2, 2),
    radius: 10,
});
const ball2 = new Ball({
    position: new Vector(200, 100),
    velocity: new Vector(-1, 0),
    color: 'blue',
});
const actors = [ball1];
const obstacles = [{x: 140, y:100, width: 100, height: 100, type: 'square', color: 'black'},
    {x: 160, y:140, width: 100, height: 30, type: 'square'}
];
let state = new State(canvas, actors);
runAnimation(time => {
    state = state.update(time, obstacles);
    canvas.sync(state, obstacles);
});