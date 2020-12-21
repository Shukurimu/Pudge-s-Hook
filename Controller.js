'use strict';
// import { Config, Clock, computeMaxStreak, InputMode } from './Config.js';
// import { Dagger, Hook } from './Castable.js';
// import { Pudge, Meat } from './Movable.js';


class Controller {
  static objectArray = [];
  static meatArray = [];
  static pudge = null;
  static hook = null;
  static dagger = null;

  static castableInputMap = new Map();
  static inputMode = null;
  static experienceElement = null;
  static levelElement = null;
  static scoreElement = null;
  static timerValue = 0;
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
    this.levelElement.textContent = 'Lv0';
    this.scoreElement = score;
    this.scoreElement.textContent = 0;
    this.timerElement = timer;
    this.timerElement.textContent = 0;
    this.indicators = indicators;
    this.scoreIndicatorElement = scoreIndicator;
    this.comboIndicatorElement = comboIndicator;
    this.inputMode = InputMode.Move;
    this.timerValue = 60;
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
    this.scoreIndicatorElement.textContent = `+${score}`;
    this.comboIndicatorElement.textContent = `#${combo}`;
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
      const distance = Math.hypot(victim.x - this.pudge.x, victim.y - this.pudge.y);
      const combo = this.hook.streak;
      const score = Config.gainScore(distance, victim.currentSpeed, combo);
      this.emitIndicators(victim.x, victim.y, score, combo);
      const expValue = Math.round(Config.expValue * 1000);
      const expAttribute = `${expValue} ${1000 - expValue}`;
      this.experienceElement.setAttribute('stroke-dasharray', expAttribute);
      this.levelElement.textContent = Config.current.displayLevelText;
      this.scoreElement.textContent = Config.currentScore.toString();
    }
    const previousUpdate = Clock.now;
    const elapse = (Clock.update() - previousUpdate) * 0.001;
    this.objectArray.forEach(o => o.updateModel(elapse));
    if ((this.timerValue -= elapse) < 0) {
      gameOver(this.hook.trialArray);
    }
    return;
  }

  static updateViews = () => {
    if (Clock.running) {
      this.timerElement.textContent = this.timerValue.toFixed(0);
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


const gameKeyListener = function (event) {
  if (event.key === 'Tab') {
    event.preventDefault();
  }
  switch (event.key.toUpperCase()) {
    case "ESCAPE":
      Clock.setRunning(!Clock.running);
      break;
    case " ":
      Controller.setInputMode(InputMode.Dagger);
      break;
    case "T":
      Controller.setInputMode(InputMode.Hook);
      break;
    default:
      console.log(event.key);
  }
  return;
};


window.onresize = function (event) {
  Config.setBoundary(window.innerWidth, window.innerHeight);
  return;
};


window.onload = function () {
  window.setInterval(Controller.updateModels, Config.ModelUpdatePeriod);
  Controller.updateViews();
  return;
};


const gameStart = function () {
  console.log('Game Start !');
  Config.reset(window.innerWidth, window.innerHeight);
  const SVG_NAMESPACE_URI = 'http://www.w3.org/2000/svg';

  const dagger = new Dagger(document.querySelector("#dagger"));
  const hook = new Hook(document.createElementNS(SVG_NAMESPACE_URI, 'line'));
  const pudge = new Pudge(document.createElementNS(SVG_NAMESPACE_URI, 'circle'));
  pudge.addCastable(hook, dagger);

  const buildMeat = () => new Meat(document.createElementNS(SVG_NAMESPACE_URI, 'circle'));
  const meatArray = Array.from({ 'length': Config.MeatAmount }, buildMeat);
  meatArray.forEach(meat => meat.randomizePosition());

  const battleField = document.querySelector("#battleField");
  battleField.replaceChildren();
  battleField.append(hook.aniElem, pudge.aniElem, ...meatArray.map(meat => meat.aniElem));

  const elementIdArray = [
    'experience', 'level', 'score', 'timer',
    'indicators', 'scoreIndicator', 'comboIndicator',
  ];
  const elementEntries = elementIdArray.map(id => [id, document.querySelector(`#${id}`)]);
  Controller.initialize(Object.fromEntries(elementEntries));
  Controller.setObjects({ pudge, hook, dagger, meatArray });
  Clock.setRunning(true);
  window.onkeydown = gameKeyListener;
  document.querySelector('#information').style.display = 'none';
  return;
}


const gameOver = function (hookTrialArray) {
  console.log('Game Over !');
  Clock.setRunning(false);
  window.onkeydown = null;
  const [bestRecord, currentScore] = Config.updateAndGetRecord();
  const difference = bestRecord - currentScore;
  const successCount = hookTrialArray.reduce((accu, value) => accu + value, 0);
  const accuracy = Math.round(100 * successCount / Math.max(hookTrialArray.length, 1));
  const maxStreak = computeMaxStreak(hookTrialArray);
  document.querySelector('#message').innerHTML = [
    "~ 遊戲結束 ~",
    `本次分數 ${currentScore} / 歷史最高分數 <abbr title='差距 ${difference}'>${bestRecord}</abbr>`,
    `[肉鉤] 使用次數 ${hookTrialArray.length} 命中率 ${accuracy}% 最高連擊 ${maxStreak}`,
  ].join('<br />');
  document.querySelector('#information').style.display = 'grid';
  return;
}


document.querySelector('#button').onclick = () => gameStart();
