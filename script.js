import { SVG_NAMESPACE_URI, computeMaxStreak } from './Util';
import Clock from './Stopwatch';
import Config from './Config';
import { Controller, InputMode } from './Controller';


const controller = new Controller(newCursor => document.body.style.cursor = newCursor);


window.addEventListener('resize', function (event) {
  controller.setBoundary(window.innerWidth, window.innerHeight);
});


window.addEventListener('contextmenu', function (event) {
  event.preventDefault();
  event.stopPropagation();
});


const gameMouseListener = function (event) {
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
};


const gameStart = function () {
  console.log('Game Start !');
  controller.initialize(6, window.innerWidth, window.innerHeight);
  document.querySelector('#screenLayer').replaceChildren(...controller.getScreenLayerElements());
  document.querySelector('#battleFieldLayer').replaceChildren(controller.battleField);

  Clock.setState(true);
  window.addEventListener('keydown', gameKeyListener);
  window.addEventListener('mousedown', gameMouseListener);
  document.querySelector('#information').style.display = 'none';
};


const gameOver = function (hookTrialArray) {
  console.log('Game Over !');
  Clock.setState(false);
  window.removeEventListener('keydown', gameKeyListener);
  window.removeEventListener('mousedown', gameMouseListener);
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
};


document.querySelector('#button').addEventListener('click', gameStart);


window.setInterval(function () {
  let gameIsOver = controller.updateModels();
  if (gameIsOver) {
    gameOver(controller.hook.trialArray);
  }
}, Config.modelUpdatePeriod);


void function raf() {
  controller.updateViews();
  window.requestAnimationFrame(raf);
}();
