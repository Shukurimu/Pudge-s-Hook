import { AbstractObject } from './Util';
import { Clock } from './Stopwatch';
import { Config } from './Config';


class Movable extends AbstractObject {

  constructor(collisionSize) {
    super();
    this.collisionSize = collisionSize;
    this.forceMoveSource = null;
  }

  withinRange(x, y, value = this.collisionSize) {
    return Math.hypot(this.x - x, this.y - y) <= value;
  }

  clipPos(axis) {  // 'x' or 'y'
    if (this[axis] < this.collisionSize) {
      this[axis] = this.collisionSize;
      return true;
    }
    let boundary = Config[axis] - this.collisionSize;
    if (this[axis] > boundary) {
      this[axis] = boundary;
      return true;
    }
    return false;
  }

  randomizePosition() {
    this.x = Math.random() * Config.x;
    this.y = Math.random() * Config.y;
    return;
  }

  normalMove(elapse) {
    throw undefined;
  }

  unlinkedPostback() {
    return;
  }

  updateModel(elapse) {
    if (this.forceMoveSource) {
      this.x = this.destX = this.forceMoveSource.x;
      this.y = this.destY = this.forceMoveSource.y;
    } else {
      this.normalMove(elapse);
    }
    return;
  }

  updateView() {
    this.aniElem.setAttribute('cx', this.x.toFixed(0));
    this.aniElem.setAttribute('cy', this.y.toFixed(0));
    return;
  }

}


export class Pudge extends Movable {

  constructor(element) {
    super(Config.pudgeCollisionSize);
    this.aniElem = element;
    this.aniElem.setAttribute('fill', 'orchid');
    this.aniElem.setAttribute('r', Config.pudgeCollisionSize);

    this.x = this.destX = Config.x * 0.5;
    this.y = this.destY = Config.y * 0.5;
    this.castableArray = [];
  }

  addCastable(...castables) {
    this.castableArray.push(...castables);
    return;
  }

  normalMove(elapse) {
    if (this.castableArray.some(c => c.isCasting())) {
      return;
    }
    let dx = this.destX - this.x;
    let dy = this.destY - this.y;
    let distance = Math.hypot(dx, dy);
    let maxRange = Config.pudgeMovementSpeed * elapse;
    if (distance <= maxRange) {
      this.x = this.destX;
      this.y = this.destY;
      this.castableArray.forEach(c => c.tryCast(this) && this.stopAction());
    } else {
      let ratio = maxRange / distance;
      this.x += dx * ratio;
      this.y += dy * ratio;
    }
    this.clipPos('x');
    this.clipPos('y');
    return;
  }

  registerMove(x, y) {
    if (this.castableArray.some(c => c.isCasting())) {
      return;
    }
    this.destX = x;
    this.destY = y;
    this.castableArray.forEach(c => c.unregister());
    return;
  }

  stopAction() {
    this.destX = this.x;
    this.destY = this.y;
    this.castableArray.forEach(c => c.unregister());
    return;
  }

}


export class Meat extends Movable {

  constructor(element) {
    super(Config.meatCollisionSize);
    this.aniElem = element;
    this.aniElem.setAttribute('fill', 'pink');
    this.aniElem.setAttribute('r', Config.meatCollisionSize);

    this.deltaX = 0;
    this.deltaY = 0;
    this.currentSpeed = 0;
    this.trendSpan = 0;
    this.trendEnd = 0;
  }

  unlinkedPostback() {
    this.randomizePosition();
    this.randomizeMovement();
    return;
  }

  randomizeMovement() {
    let radians = Math.PI * 2 * Math.random();
    this.currentSpeed = Config.meatSpeedMin + Math.random() * Config.meatSpeedRange;
    this.deltaX = this.currentSpeed * Math.cos(radians);
    this.deltaY = this.currentSpeed * Math.sin(radians);
    this.trendSpan = (Math.random() * 0.5 + 0.5) * Config.meatTrendPeriod;
    this.trendEnd = Clock.now + this.trendSpan;
    return;
  }

  normalMove(elapse) {
    if (Clock.now >= this.trendEnd) {
      this.randomizeMovement();
    }
    if (this.clipPos('x')) {
      this.deltaX *= -1;
    }
    if (this.clipPos('y')) {
      this.deltaY *= -1;
    }
    this.x += this.deltaX * elapse;
    this.y += this.deltaY * elapse;
    return;
  }

}
