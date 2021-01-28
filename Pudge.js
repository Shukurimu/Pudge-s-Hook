import { Movable } from './AbstractObject';
import Config from './Config';


export default class Pudge extends Movable {

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
