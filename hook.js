'use strict';

const InputMode = Object.freeze({ 'Move': 'auto', 'Hook': 'crosshair', 'Dagger': 'cell' });

class Config {
  // Time-based values are measured in millisecond.
  static ModelUpdatePeriod = 12;
  static HookProjectileSpeed = 1500;
  static DaggerMaxDistance = 1200;
  static DaggerPenaltyRatio = 0.8;
  static DaggerBackswing = 120;
  static DaggerCooldown = 2400;
  static PudgeMovementSpeed = 300;
  static PudgeCollisionSize = 20;
  static MeatCollisionSize = 24;
  static MeatAmount = 10;
  static LevelList = [
    {
      'displayLevelText': "Lv1",
      'scoreThreshold': 1200,
      'hookCastRange': 600,
      'meatSpeedMin': 40,
      'meatSpeedRange': 100,
      'meatTrendPeriod': 4000,
    },
    {
      'displayLevelText': "Lv2",
      'scoreThreshold': 3600,
      'hookCastRange': 750,
      'meatSpeedMin': 60,
      'meatSpeedRange': 200,
      'meatTrendPeriod': 3400,
    },
    {
      'displayLevelText': "Lv3",
      'scoreThreshold': 10800,
      'hookCastRange': 900,
      'meatSpeedMin': 80,
      'meatSpeedRange': 300,
      'meatTrendPeriod': 2800,
    },
    {
      'displayLevelText': "Lv4",
      'scoreThreshold': Infinity,
      'hookCastRange': 1050,
      'meatSpeedMin': 100,
      'meatSpeedRange': 400,
      'meatTrendPeriod': 2200,
    },
  ];
  static currentLevel = 0;
  static currentScore = 0;
  static x = 800;
  static y = 600;

  static get current() {
    return this.LevelList[this.currentLevel];
  }

  static reset(boundaryX, boundaryY) {
    this.currentLevel = 0;
    this.x = boundaryX;
    this.y = boundaryY;
    console.log('boundary', this.x, this.y);
    return;
  }

  static gainScore(meatMovementSpeed, hookStreak) {
    let score = 40 * this.currentLevel + meatMovementSpeed * (0.75 + 0.25 * hookStreak);
    score = Math.floor(score);
    const newScore = this.currentScore += score;
    this.currentLevel = this.LevelList.findIndex(c => c.scoreThreshold >= newScore);
    return score;
  }

  static get expValue() {
    if (this.currentLevel === this.LevelList.length - 1) {
      return 1;
    }
    const base = this.currentLevel === 0 ? 0 : this.LevelList[this.currentLevel - 1].scoreThreshold;
    const total = this.LevelList[this.currentLevel].scoreThreshold;
    return (this.currentScore - base) / total;
  }

  get record() {
    return Number.parseInt(window.localStorage.getItem('score') ?? '0', 10);
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

  static toggle() {
    if (this.running ^= true) {
      this.play();
    } else {
      this.stop();
    }
    return;
  }

  static update() {
    if (this.running) {
      let now = performance.now();
      let delta = this.latestPlay === null ? 0 : (now - this.latestPlay);
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
    this.trialList = [];
  }

  getSrcDestPos(caster, x, y) {
    let dx = x - caster.x;
    let dy = y - caster.y;
    let distance = Math.hypot(dx, dy);
    let exceedance = distance - Config.current.hookCastRange;
    let multiplier = Math.max(exceedance, 0) / distance;
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
    this.trialList.push(0);
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
        this.trialList[this.trialList.length - 1] = 1;
        return prey;
      }
    }
    return null;
  }

  get streak() {
    return this.trialList.length - this.trialList.lastIndexOf(0) - 1;
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


class Pudge extends Movable {

  constructor(element) {
    super(Config.PudgeCollisionSize);
    this.aniElem = element;
    this.aniElem.setAttribute('fill', 'pink');
    this.aniElem.setAttribute('r', Config.PudgeCollisionSize);

    this.x = this.destX = Config.x * 0.5;
    this.y = this.destY = Config.y * 0.5;
    this.castableList = [];
  }

  addCastable(...castables) {
    this.castableList.push(...castables);
    return;
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

  constructor(element) {
    super(Config.MeatCollisionSize);
    this.aniElem = element;
    this.aniElem.setAttribute('fill', 'purple');
    this.aniElem.setAttribute('r', Config.MeatCollisionSize);

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
    let radians = Math.PI * 2 * Math.random();
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
  static objectArray = [];
  static meatArray = [];
  static pudge = null;
  static hook = null;
  static dagger = null;

  static castableInputMap = new Map();
  static inputMode = 0;
  static experienceElement = null;
  static levelElement = null;
  static scoreElement = null;
  static timerValue = 60;
  static timerElement = null;
  static indicators = null;
  static scoreIndicatorElement = null;
  static comboIndicatorElement = null;

  static initialize({
      experience, level, score, timer,
      indicators, scoreIndicator, comboIndicator,
    }) {
    this.experienceElement = experience;
    this.levelElement = level;
    this.levelElement.innerHTML = 'Lv0';
    this.scoreElement = score;
    this.scoreElement.innerHTML = 0;
    this.timerElement = timer;
    this.timerElement.innerHTML = 0;
    this.indicators = indicators;
    this.scoreIndicatorElement = scoreIndicator;
    this.comboIndicatorElement = comboIndicator;
    return;
  }

  static setObjects({ pudge, hook, dagger, meatArray }) {
    this.objectArray = Array.of(pudge, hook, dagger, ...meatArray);
    this.pudge = pudge;
    this.hook = hook;
    this.dagger = dagger;
    this.meatArray = meatArray;
    this.castableInputMap.set(InputMode.Hook, hook);
    this.castableInputMap.set(InputMode.Dagger, dagger);
    return;
  }

  static emitIndicators(x, y, score, combo) {
    this.scoreIndicatorElement.innerHTML = `+${score}`;
    this.comboIndicatorElement.innerHTML = `#${combo}`;
    Object.assign(this.indicators.style, {
      'left': `${x.toFixed(0)}px`,
      'top': `${y.toFixed(0)}px`,
      'animationName': 'none',
    });
    const rect = this.indicators.getBoundingClientRect();
    const dx = Math.min(Config.x - rect.right, 0) - Math.min(rect.left, 0);
    const dy = Math.min(Config.y - rect.bottom, 0) - Math.min(rect.top, 0);
    Object.assign(this.indicators.style, {
      'left': `${(x + dx).toFixed(0)}px`,
      'top': `${(y + dy).toFixed(0)}px`,
      'animationName': 'indicatorAnimation',
    });
    return;
  }

  static updateModels = () => {
    if (!Clock.running) {
      return;
    }
    let victim = this.hook.tryAttack(this.meatArray);
    if (victim != null) {
      const combo = this.hook.streak;
      const score = Config.gainScore(victim.currentSpeed, combo);
      console.log(victim.currentSpeed.toFixed(2), combo, score);
      this.emitIndicators(victim.x, victim.y, score, combo);
      const expValue = Math.round(Config.expValue * 1000);
      const expAttribute = `${expValue} ${1000 - expValue}`;
      this.experienceElement.setAttribute('stroke-dasharray', expAttribute);
      this.levelElement.innerHTML = Config.current.displayLevelText;
      this.scoreElement.innerHTML = Config.currentScore.toString();
    }
    const previousUpdate = Clock.now;
    const elapse = (Clock.update() - previousUpdate) * 0.001;
    this.objectArray.forEach(o => o.updateModel(elapse));
    this.timerValue -= elapse;
    return;
  }

  static updateViews = () => {
    if (Clock.running) {
      this.timerElement.innerHTML = this.timerValue.toFixed(0);
      this.objectArray.forEach(o => o.updateView());
    }
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
      Clock.toggle();
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
  const SVG_NAMESPACE_URI = 'http://www.w3.org/2000/svg';

  const dagger = new Dagger(document.querySelector("#dagger"));
  const hook = new Hook(document.createElementNS(SVG_NAMESPACE_URI, 'line'));
  const pudge = new Pudge(document.createElementNS(SVG_NAMESPACE_URI, 'circle'));
  pudge.addCastable(hook, dagger);

  const buildMeat = () => new Meat(document.createElementNS(SVG_NAMESPACE_URI, 'circle'));
  const meatArray = Array.from({ 'length': Config.MeatAmount }, buildMeat);
  meatArray.forEach(meat => meat.randomizePosition());

  document.querySelector("#battleField")
          .append(hook.aniElem, pudge.aniElem, ...meatArray.map(meat => meat.aniElem));

  const elementIdArray = [
    'experience', 'level', 'score', 'timer',
    'indicators', 'scoreIndicator', 'comboIndicator',
  ];
  const elementEntries = elementIdArray.map(id => [id, document.querySelector(`#${id}`)]);
  Controller.initialize(Object.fromEntries(elementEntries));
  Controller.setObjects({ pudge, hook, dagger, meatArray });

  window.setInterval(Controller.updateModels, Config.ModelUpdatePeriod);
  Controller.updateViews();
  return;
};
