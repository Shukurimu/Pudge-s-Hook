const InputMode = Object.freeze({ 'Move': 'auto', 'Hook': 'crosshair', 'Dagger': 'cell' });

class Config {
  // Time-based values are measured in millisecond.
  static HookProjectileSpeed = 1500;
  static DaggerMaxDistance = 1200;
  static DaggerPenaltyRatio = 0.8;
  static DaggerBackswing = 120;
  static DaggerCooldown = 2400;
  static PudgeMovementSpeed = 300;
  static LevelList = [
    {	// Level 1
      'scoreThreshold': 0,
      'hookCastRange': 300,
      'meatSpeedMin': 40,
      'meatSpeedRange': 100,
      'meatTrendPeriod': 4000,
    },
    {	// Level 2
      'scoreThreshold': 3200,
      'hookCastRange': 550,
      'meatSpeedMin': 60,
      'meatSpeedRange': 200,
      'meatTrendPeriod': 3000,
    },
    {	// Level 3
      'scoreThreshold': 6400,
      'hookCastRange': 800,
      'meatSpeedMin': 80,
      'meatSpeedRange': 300,
      'meatTrendPeriod': 2000,
    },
    {	// Level 4
      'scoreThreshold': 9600,
      'hookCastRange': 1050,
      'meatSpeedMin': 100,
      'meatSpeedRange': 400,
      'meatTrendPeriod': 1000,
    },
  ];
  static currentLevel = 1;
  static currentScore = 0;
  static x = 800;
  static y = 600;

  static get current() {
    return this.LevelList[this.currentLevel];
  }

  static reset(boundaryX, boundaryY) {
    this.currentLevel = 1;
    this.x = boundaryX;
    this.y = boundaryY;
    console.log('reset', this.x, this.y);
    return;
  }

  // var tmp = ~~(vSpeed * vSpeed * 41) + ((index * index + vLevel) << 4) + (Math.pow(vCombo, 3) << 3) + 379;
  static gainScore(score) {
    this.currentScore += score;
    let levelConfig = Config.LevelList;
    if (levelConfig.length == Config.currentLevel) {
      return;
    }
    for (let i = Config.currentLevel; i < levelConfig.length; ++i) {
      let threshold = levelConfig[i].scoreThreshold;
      if (this.currentScore >= threshold) {
        continue;
      }
      let base = levelConfig[i - 1].scoreThreshold;
      this.experience = (this.score - base) / (threshold - base);
      Config.currentLevel = i;
      return;
    }
    this.experience = 1.0;
    Config.currentLevel = levelConfig.length;
    return;
  }

}


class Clock {
  static running = false;
  static latestPlay = null;
  static executionMillis = 0;

  static reset() {
    this.running = false;
    this.latestPlay = null;
    this.executionMillis = 0;
    return;
  }

  static play() {
    this.running = true;
    this.latestPlay = performance.now();
    return;
  }

  static stop() {
    this.running = false;
    this.executionMillis += performance.now() - this.latestPlay;
    this.latestPlay = null;
    return;
  }

  static update() {
    if (this.running) {
      let now = performance.now();
      let delta = this.latestPlay == null ? 0 : (now - this.latestPlay);
      this.executionMillis += delta;
      this.latestPlay = now;
    }
    return this.executionMillis;
  }

  static get now() {
    return this.executionMillis;
  }

}


function getVectorPoint(vectorFrom, vectorTo, multiplier) {
  return vectorFrom + (vectorTo - vectorFrom) * multiplier;
}


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
    let dx = x - caster.x;
    let dy = y - caster.y;
    let distance = Math.hypot(dx, dy);
    let blinkDistance = distance <= Config.DaggerMaxDistance
      ? distance : (Config.DaggerMaxDistance * Config.DaggerPenaltyRatio);
    console.log(`Blink ${distance.toFixed(0)} -> ${blinkDistance.toFixed(0)}`);

    let multiplier = Math.min(blinkDistance / distance, 1.0);
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
    caster.x = this.destX;
    caster.y = this.destY;
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
      Math.PI * (2.0 * multiplier - 0.5), Dagger.END_ANGLE,
      // The angle at which the arc starts / ends in radians, measured from the positive x-axis.
    );
    this.context2d.fill();
    return;
  }

}


class Hook extends Castable {

  constructor() {
    super(false);
    this.aniElem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    this.aniElem.setAttribute('stroke', 'brown');
    this.aniElem.setAttribute('stroke-width', 5);

    this.skillStart = 0;
    this.skillMid = 0;
  }

  getSrcDestPos(caster, x, y) {
    let dx = x - caster.x;
    let dy = y - caster.y;
    let distance = Math.hypot(dx, dy);
    let exceedance = distance - Config.current.hookCastRange;
    let multiplier = Math.max(exceedance, 0.0) / distance;
    return [
      getVectorPoint(caster.x, x, multiplier),
      getVectorPoint(caster.y, y, multiplier),
      x,
      y,
    ];
  }

  cast(caster) {
    let castRange = Config.current.hookCastRange;
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

  tryAttack(preyList) {
    if (Clock.now >= this.skillMid) {
      return null;
    }
    for (let prey of preyList) {
      if (prey.withinRange(this.x, this.y)) {
        this.destX = prey.x;
        this.destY = prey.y;
        this.skillMid = Clock.now;
        this.skillEnd = this.backswingEnd = 2 * this.skillMid - this.skillStart;
        this.linkObject(prey);
        return prey;
      }
    }
    return null;
  }

}


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
    if (this.forceMoveSource == null) {
      this.normalMove(elapse);
    } else {
      this.x = this.forceMoveSource.x;
      this.y = this.forceMoveSource.y;
    }
    return;
  }

  updateView() {
    this.aniElem.setAttribute('cx', this.x.toFixed(0));
    this.aniElem.setAttribute('cy', this.y.toFixed(0));
    return;
  }

}


class Pudge extends Movable {

  constructor(collisionSize, ...castableList) {
    super(collisionSize);
    this.aniElem = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.aniElem.setAttribute('opacity', 0.7);
    this.aniElem.setAttribute('fill', 'pink');
    this.aniElem.setAttribute('r', collisionSize);

    this.destX = 0;
    this.destY = 0;
    this.castableList = castableList;
  }

  normalMove(elapse) {
    if (this.castableList.some(c => c.isCasting())) {
      return;
    }
    let dx = this.destX - this.x;
    let dy = this.destY - this.y;
    let distance = Math.hypot(dx, dy);
    let maxRange = Config.PudgeMovementSpeed * elapse;
    if (distance <= maxRange) {
      this.x = this.destX;
      this.y = this.destY;
      this.castableList.forEach(c => c.tryCast(this) && this.stopAction());
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
    if (this.castableList.some(c => c.isCasting())) {
      return;
    }
    this.destX = x;
    this.destY = y;
    this.castableList.forEach(c => c.unregister());
    return;
  }

  stopAction() {
    this.destX = this.x;
    this.destY = this.y;
    this.castableList.forEach(c => c.unregister());
    return;
  }

}


class Meat extends Movable {

  constructor(collisionSize) {
    super(collisionSize);
    this.aniElem = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    this.aniElem.setAttribute('opacity', 0.7);
    this.aniElem.setAttribute('fill', 'purple');
    this.aniElem.setAttribute('r', collisionSize);

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
    let setting = Config.current;
    let radians = Math.PI * 2.0 * Math.random();
    this.currentSpeed = setting.meatSpeedMin + Math.random() * setting.meatSpeedRange;
    this.deltaX = this.currentSpeed * Math.cos(radians);
    this.deltaY = this.currentSpeed * Math.sin(radians);
    this.trendSpan = (Math.random() * 0.5 + 0.5) * setting.meatTrendPeriod;
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


class Controller {
  static objectList = [];
  static meatList = [];
  static pudge = null;
  static hook = null;
  static dagger = null;

  static castableInputMap = new Map();
  static inputMode = 0;
  static timerElement = null;
  static timerValue = 60;
  static scoreElement = null;

  static setObjects(pudge, hook, dagger, meatList) {
    this.objectList = Array.of(pudge, hook, dagger, ...meatList);
    this.pudge = pudge;
    this.hook = hook;
    this.dagger = dagger;
    this.meatList = meatList;
    this.castableInputMap.set(InputMode.Hook, hook);
    this.castableInputMap.set(InputMode.Dagger, dagger);
    return;
  }

  static reset(timer, score) {
    this.timerElement = timer;
    this.timerElement.innerHTML = 0;
    this.scoreElement = score;
    this.scoreElement.innerHTML = 0;
  }

  static updateModels = () => {
    if (!Clock.running) {
      return;
    }
    let previousTime = Clock.now * 0.001;
    let latestTime = Clock.update() * 0.001;
    let elapse = latestTime - previousTime;
    this.timerValue -= elapse;
    let victim = this.hook.tryAttack(this.meatList);
    if (victim != null) {
      console.log('!');
      let rawScore = victim.currentSpeed * (Clock.now - this.hook.skillStart);
      Config.gainScore(Math.sqrt(rawScore));
    }
    // gacha.html("+" + tmp).css({ left: (px - 64), top: (py - 36), opacity: .4 }).animate({ top: "-=49px", opacity: 0 }, 480, "linear");
    this.objectList.forEach(o => o.updateModel(elapse));
    return;
  }

  static updateViews = () => {
    this.objectList.forEach(o => o.updateView());
    this.timerElement.innerHTML = this.timerValue.toFixed(0);
    this.scoreElement.innerHTML = Config.currentScore.toFixed(0);
    window.requestAnimationFrame(this.updateViews);
    return;
  }

  static playerMove(x, y) {
    if (!Clock.running) {
      return;
    }
    this.pudge.registerMove(x, y);
    document.body.style.cursor = InputMode.Move;
    return;
  }

  static setInputMode(inputMode) {
    if (!Clock.running) {
      return;
    }
    if (this.castableInputMap.get(inputMode).isReady()) {
      this.inputMode = inputMode;
      document.body.style.cursor = inputMode;
    } else {
      document.body.style.cursor = InputMode.Move;
    }
    return;
  }

  static launchInput(x, y) {
    if (!Clock.running) {
      return;
    }
    switch (this.inputMode) {
      case InputMode.Hook:
        this.hook.register(this.pudge, x, y);
        break;
      case InputMode.Dagger:
        this.dagger.register(this.pudge, x, y);
        break;
    }
    document.body.style.cursor = this.inputMode = InputMode.Move;
    return;
  }

}


window.oncontextmenu = function (event) {
  event.preventDefault();
  event.stopPropagation();
  return;
};


window.onmousedown = function (event) {
  switch (event.button) {
    case 2:  // right-click
      Controller.playerMove(event.clientX, event.clientY);
      break;
    case 0:  // left-click
      Controller.launchInput(event.clientX, event.clientY);
      break;
    default:
      console.log(event.button, event.clientX, event.clientY);
  }
  return;
};


window.onkeydown = function (event) {
  switch (event.which) {
    case 27:  // Escape
      // document.title = Controller.switchMode() ? '[Running]' : '[Paused]';
      if (Clock.running ^= true)
        Clock.play();
      else
        Clock.stop();
      break;
    case 32:  // Space
      Controller.setInputMode(InputMode.Dagger);
      break;
    case 84:  // T
      Controller.setInputMode(InputMode.Hook);
      break;
    default:
      console.log(event.which);
  }
  return;
};


window.onload = function () {
  Config.reset(window.innerWidth, window.innerHeight);

  const canvas = document.querySelector("#canvas");
  let dagger = new Dagger(canvas);
  let hook = new Hook();
  let pudge = new Pudge(20, hook, dagger);
  let meatList = []
  for (let i = 0; i < 10; ++i) {
    let meat = new Meat(24);
    meat.randomizePosition();
    meatList.push(meat);
  }

  const svg = document.querySelector("#svg");
  svg.appendChild(hook.aniElem);
  svg.appendChild(pudge.aniElem);
  meatList.forEach(m => svg.appendChild(m.aniElem));

  Controller.setObjects(pudge, hook, dagger, meatList);
  const timer = document.querySelector("#timer");
  const score = document.querySelector("#score");
  Controller.reset(timer, score);

  window.setInterval(Controller.updateModels, 10);
  Controller.updateViews();
  console.log('Oops');
  return;
};

// var best = Math.max(vScore, localStorage.hook ? Number(localStorage.hook) : 0);
// localStorage.hook = best;
