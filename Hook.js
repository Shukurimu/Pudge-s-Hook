import { Castable } from './AbstractObject';
import { getVectorPoint } from './Util';
import Clock from './Stopwatch';
import Config from './Config';


export default class Hook extends Castable {

  constructor(element) {
    super(false);
    this.aniElem = element;
    this.aniElem.setAttribute('stroke', 'coral');
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
    let halfTime = 1000 * castRange / Config.hookProjectileSpeed;
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
