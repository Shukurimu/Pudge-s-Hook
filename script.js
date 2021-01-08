import { SVG_NAMESPACE_URI, computeMaxStreak } from './Util';
import { Clock } from './Stopwatch';
import { Config, InputMode } from './Config';
import { Dagger, Hook } from './Castable';
import { Pudge, Meat } from './Movable';
import { Controller } from './Controller';


const controller = new Controller();
const boundaryElement = document.querySelector('#boundary');


window.onresize = function (event) {
  Config.setBoundary(window.innerWidth, window.innerHeight);
  boundaryElement.textContent = `${window.innerWidth}*${window.innerHeight}`;
  return;
};


window.oncontextmenu = function (event) {
  event.preventDefault();
  event.stopPropagation();
  return;
};


window.onmousedown = function (event) {
  switch (event.button) {
    case 2:  // right-click
      controller.playerMove(event.clientX, event.clientY);
      break;
    case 0:  // left-click
      controller.launchInput(event.clientX, event.clientY);
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
      Clock.setState(!Clock.isRunning());
      break;
    case " ":
      controller.setInputMode(InputMode.Dagger);
      break;
    case "T":
      controller.setInputMode(InputMode.Hook);
      break;
    default:
      console.log(event.key);
  }
  return;
};


document.querySelector('#button').onclick = function () {
  console.log('Game Start !');
  Config.reset(window.innerWidth, window.innerHeight);

  const dagger = new Dagger(document.querySelector("#dagger"));
  const hook = new Hook(document.createElementNS(SVG_NAMESPACE_URI, 'line'));
  const pudge = new Pudge(document.createElementNS(SVG_NAMESPACE_URI, 'circle'));
  pudge.addCastable(hook, dagger);

  const buildMeat = () => new Meat(document.createElementNS(SVG_NAMESPACE_URI, 'circle'));
  const meatArray = Array.from({ 'length': Config.meatAmount }, buildMeat);
  meatArray.forEach(meat => meat.randomizePosition());

  const battleField = document.querySelector("#battleField");
  battleField.replaceChildren();
  battleField.append(hook.aniElem, pudge.aniElem, ...meatArray.map(meat => meat.aniElem));

  const elementIdArray = [
    'experience', 'level', 'score', 'timer',
    'indicators', 'scoreIndicator', 'comboIndicator',
  ];
  const elementEntries = elementIdArray.map(id => [id, document.querySelector(`#${id}`)]);
  controller.initialize(Object.fromEntries(elementEntries));
  controller.setObjects({ pudge, hook, dagger, meatArray });
  Clock.setState(true);
  window.onkeydown = gameKeyListener;
  document.querySelector('#information').style.display = 'none';
  return;
};


const gameOver = function (hookTrialArray) {
  console.log('Game Over !');
  Clock.setState(false);
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
};


window.setInterval(function () {
  let gameIsOver = controller.updateModels();
  if (gameIsOver) {
    gameOver(controller.hook.trialArray);
  }
  return;
}, Config.modelUpdatePeriod);


void function raf() {
  controller.updateViews();
  window.requestAnimationFrame(raf);
  return;
}();


// TODO: document.createElementNS(SVG_NAMESPACE_URI, "svg");
