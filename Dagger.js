import { Castable } from './AbstractObject';
import { getVectorPoint } from './Util';
import Clock from './Stopwatch';
import Config from './Config';

// Context2d: The angle at which the arc origins in radians, measured from the positive x-axis.
const END_ANGLE = Math.PI * 1.5;

export default class Dagger extends Castable {

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
    const blinkDistance = distance <= maxDistance
      ? distance
      : (maxDistance * Config.daggerPenaltyRatio);
    console.log(`Attempt ${~~distance}  Limit ${~~maxDistance}  Result ${~~blinkDistance}`);

    let multiplier = distance < 1 ? 1 : Math.min(blinkDistance / distance, 1);
    return [
      caster.x,
      caster.y,
      getVectorPoint(caster.x, x, multiplier),
      getVectorPoint(caster.y, y, multiplier),
    ];
  }

  cast(caster) {
    this.backswingEnd = Clock.now + Config.daggerBackswing;
    this.skillEnd = Clock.now + Config.daggerCooldown;
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
    let multiplier = Math.max(remain, 0) / Config.daggerBackswing;
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
    let multiplier = 1 - (this.skillEnd - Clock.now) / Config.daggerCooldown;
    this.context2d.beginPath();
    this.context2d.moveTo(this.canvasMidX, this.canvasMidY);
    this.context2d.arc(
      this.canvasMidX, this.canvasMidY, this.canvasSpan,
      Math.PI * (2 * multiplier - 0.5), END_ANGLE,
    );
    this.context2d.fill();
    return;
  }

}
