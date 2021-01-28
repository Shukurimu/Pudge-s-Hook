import { Movable } from './AbstractObject';
import Clock from './Stopwatch';
import Config from './Config';


export default class Meat extends Movable {

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
