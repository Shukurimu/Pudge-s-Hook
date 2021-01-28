import Clock from './Stopwatch';
import Config from './Config';


class AbstractObject {

  constructor() {
    this.x = 0;
    this.y = 0;
  }

  updateModel(elapse) {
    throw undefined;
  }

  updateView() {
    throw undefined;
  }

}


export class Movable extends AbstractObject {

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


export class Castable extends AbstractObject {

  constructor(localCast) {
    super();
    this.localCast = localCast;
    this.pending = false;
    this.srcX = 0;
    this.srcY = 0;
    this.destX = 0;
    this.destY = 0;
    this.linkedObject = null;
    this.backswingEnd = 0;
    this.skillEnd = 0;
  }

  isReady() {
    return Clock.now >= this.skillEnd;
  }

  isCasting() {
    return Clock.now < this.backswingEnd;
  }

  getSrcDestPos(caster, x, y) {
    throw undefined;
  }

  register(caster, x, y) {
    [this.srcX, this.srcY, this.destX, this.destY] = this.getSrcDestPos(caster, x, y);
    caster.registerMove(this.srcX, this.srcY);
    this.pending = true;
    return;
  }

  unregister() {
    this.pending = false;
    return;
  }

  cast(caster) {
    throw undefined;
  }

  tryCast(caster) {
    if (this.pending && caster.withinRange(this.srcX, this.srcY, 1)) {
      this.pending = false;
      this.cast(caster);
      return true;
    } else {
      return false;
    }
  }

  linkObject(target) {
    this.unlinkObject();
    this.linkedObject = target;
    target.forceMoveSource = this;
    return;
  }

  unlinkObject() {
    if (this.linkedObject !== null) {
      this.linkedObject.forceMoveSource = null;
      this.linkedObject.unlinkedPostback();
      this.linkedObject = null;
    }
    return;
  }

}
