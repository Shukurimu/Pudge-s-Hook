import { Clock } from './Stopwatch';
import { Config, InputMode } from './Config';


export class Controller {

  constructor(cursorSetter) {
    this.cursorSetter = cursorSetter;
    this.objectArray = [];
    this.meatArray = [];
    this.pudge = null;
    this.hook = null;
    this.dagger = null;

    this.castableInputMap = new Map();
    this.inputMode = null;
    this.experienceElement = null;
    this.levelElement = null;
    this.scoreElement = null;
    this.timerValue = 0;
    this.timerElement = null;
    this.indicators = null;
    this.scoreIndicatorElement = null;
    this.comboIndicatorElement = null;
  }

  initialize(timerValue, {
    experience, level, score, timer,
    indicators, scoreIndicator, comboIndicator,
  }) {
    this.timerValue = timerValue;
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
    return;
  }

  setObjects({ pudge, hook, dagger, meatArray }) {
    this.objectArray = Array.of(pudge, hook, dagger, ...meatArray);
    this.pudge = pudge;
    this.hook = hook;
    this.dagger = dagger;
    this.meatArray = meatArray;
    this.castableInputMap.set(InputMode.Hook, hook);
    this.castableInputMap.set(InputMode.Dagger, dagger);
    return;
  }

  emitIndicators(x, y, score, combo) {
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

  updateModels() {
    if (!Clock.isRunning()) {
      return false;
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
      this.levelElement.textContent = Config.displayLevelText;
      this.scoreElement.textContent = Config.currentScore.toString();
    }
    const previousUpdate = Clock.now;
    const elapse = (Clock.update() - previousUpdate) * 0.001;
    this.objectArray.forEach(o => o.updateModel(elapse));
    return (this.timerValue -= elapse) < 0;
  }

  updateViews() {
    if (Clock.isRunning()) {
      this.timerElement.textContent = this.timerValue.toFixed(0);
      this.objectArray.forEach(o => o.updateView());
    }
    return;
  }

  playerMove(x, y) {
    if (!Clock.isRunning()) {
      return;
    }
    this.pudge.registerMove(x, y);
    this.cursorSetter(InputMode.Move);
    return;
  }

  setInputMode(inputMode) {
    if (!Clock.isRunning()) {
      return;
    }
    if (this.castableInputMap.get(inputMode).isReady()) {
      this.cursorSetter(this.inputMode = inputMode);
    } else {
      this.cursorSetter(InputMode.Move);
    }
    return;
  }

  launchInput(x, y) {
    if (!Clock.isRunning()) {
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
    this.cursorSetter(this.inputMode = InputMode.Move);
    return;
  }

}
