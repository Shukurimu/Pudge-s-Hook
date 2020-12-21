'use strict';
// import { Config, Clock, AbstractObject, getVectorPoint } from './Config.js';


class Castable extends AbstractObject {

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
    if (this.linkedObject != null) {
      this.linkedObject.forceMoveSource = null;
      this.linkedObject.unlinkedPostback();
      this.linkedObject = null;
    }
    return;
  }

}


class Dagger extends Castable {
  static END_ANGLE = Math.PI * 1.5;

  constructor(canvas) {
    super(true);
    this.context2d = canvas.getContext("2d");
    this.context2d.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.canvasMidX = canvas.width * 0.5;
    this.canvasMidY = canvas.height * 0.5;
    this.canvasSpan = Math.max(canvas.width, canvas.height);
    canvas.style.backgroundSize = `${canvas.width}px ${canvas.height}px`;

    this.blinkFinished = true;
  }

  getSrcDestPos(caster, x, y) {
    const dx = x - caster.x;
    const dy = y - caster.y;
    const distance = Math.hypot(dx, dy);
    const maxDistance = Config.daggerMaxDistance;
    const blinkDistance = distance <= maxDistance ? distance
                        : (maxDistance * Config.DaggerPenaltyRatio);
    console.log(`Attempt ${distance.toFixed(0)}`,
                `Max ${maxDistance.toFixed(0)}`,
                `Final ${blinkDistance.toFixed(0)}`);

    let multiplier = distance < 1 ? 1 : Math.min(blinkDistance / distance, 1);
    return [
      caster.x,
      caster.y,
      getVectorPoint(caster.x, x, multiplier),
      getVectorPoint(caster.y, y, multiplier),
    ];
  }

  cast(caster) {
    this.backswingEnd = Clock.now + Config.DaggerBackswing;
    this.skillEnd = Clock.now + Config.DaggerCooldown;
    this.blinkFinished = false;
    this.linkObject(caster);
    return;
  }

  updateModel(elapse) {
    if (this.blinkFinished) {
      this.unlinkObject();
      return;
    }
    let remain = this.backswingEnd - Clock.now;
    let multiplier = Math.max(remain, 0) / Config.DaggerBackswing;
    this.x = getVectorPoint(this.destX, this.srcX, multiplier);
    this.y = getVectorPoint(this.destY, this.srcY, multiplier);
    this.blinkFinished = remain < 0;
    return;
  }

  updateView() {
    this.context2d.clearRect(0, 0, this.canvasSpan, this.canvasSpan);
    if (this.isReady()) {
      return;
    }
    let multiplier = 1 - (this.skillEnd - Clock.now) / Config.DaggerCooldown;
    this.context2d.beginPath();
    this.context2d.moveTo(this.canvasMidX, this.canvasMidY);
    this.context2d.arc(
      this.canvasMidX, this.canvasMidY, this.canvasSpan,
      Math.PI * (2 * multiplier - 0.5), Dagger.END_ANGLE,
      // The angle at which the arc starts / ends in radians, measured from the positive x-axis.
    );
    this.context2d.fill();
    return;
  }

}


class Hook extends Castable {

  constructor(element) {
    super(false);
    this.aniElem = element;
    this.aniElem.setAttribute('stroke', 'brown');
    this.aniElem.setAttribute('stroke-width', 5);

    this.skillStart = 0;
    this.skillMid = 0;
    this.trialArray = [];
  }

  getSrcDestPos(caster, x, y) {
    let dx = x - caster.x;
    let dy = y - caster.y;
    let distance = Math.hypot(dx, dy);
    let exceedance = distance - Config.hookCastRange;
    let multiplier = Math.max(exceedance, 0) / distance;
    return [
      getVectorPoint(caster.x, x, multiplier),
      getVectorPoint(caster.y, y, multiplier),
      x,
      y,
    ];
  }

  cast(caster) {
    let castRange = Config.hookCastRange;
    let halfTime = 1000 * castRange / Config.HookProjectileSpeed;
    this.skillMid = Clock.now + halfTime;
    this.skillEnd = this.backswingEnd = this.skillMid + halfTime;
    this.skillStart = Clock.now;
    this.x = this.srcX = caster.x;
    this.y = this.srcY = caster.y;
    let dx = this.destX - this.srcX;
    let dy = this.destY - this.srcY;
    let multiplier = castRange / Math.hypot(dx, dy);
    this.destX = getVectorPoint(this.srcX, this.destX, multiplier);
    this.destY = getVectorPoint(this.srcY, this.destY, multiplier);
    this.trialArray.push(0);
    return;
  }

  updateModel() {
    if (this.isReady()) {
      this.unlinkObject();
      return;
    }
    let multiplier = Math.abs(this.skillMid - Clock.now) / (this.skillEnd - this.skillMid);
    this.x = getVectorPoint(this.destX, this.srcX, multiplier);
    this.y = getVectorPoint(this.destY, this.srcY, multiplier);
    return;
  }

  updateView() {
    if (this.isReady()) {
      this.aniElem.style.opacity = 0;
      return;
    }
    this.aniElem.style.opacity = 1;
    this.aniElem.setAttribute('x1', this.srcX.toFixed(0));
    this.aniElem.setAttribute('y1', this.srcY.toFixed(0));
    this.aniElem.setAttribute('x2', this.x.toFixed(0));
    this.aniElem.setAttribute('y2', this.y.toFixed(0));
    return;
  }

  tryAttack(preyArray) {
    if (Clock.now >= this.skillMid) {
      return null;
    }
    for (let prey of preyArray) {
      if (prey.withinRange(this.x, this.y)) {
        this.destX = prey.x;
        this.destY = prey.y;
        this.skillMid = Clock.now;
        this.skillEnd = this.backswingEnd = 2 * this.skillMid - this.skillStart;
        this.linkObject(prey);
        this.trialArray[this.trialArray.length - 1] = 1;
        return prey;
      }
    }
    return null;
  }

  get streak() {
    return this.trialArray.length - this.trialArray.lastIndexOf(0) - 1;
  }

}

// export { Dagger, Hook };
