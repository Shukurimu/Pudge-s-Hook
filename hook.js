/* Created by Shukurimu */

var trytimes, accurate;
var maxw, maxh;
var blink = 210;
var maxspeed = [0, 8, 10, 12, 14];
var minspeed = [0, 0, 1, 2, 3];
var resetime = [0, 630, 420, 210, 99];
var spot = [0, 16, 24, 32, 40];
var leng = [9, 4, 7, 10, 13];
var rang = [];
var item = [];
var fps, remain;
var dagger, cd;
var tips, body;
var gacha, speed;
var score, level;
var combo, timer;
var pudge, meats;
var vCombo, vLevel;
var vScore, vSpeed;
var sQueue, sCatch;
var sPress, sProgs;
var mvSteps, mSpan;
var sx, sy, vx, vy;
var px, py, mx, my;
var index, skill, icon;

function adjust() {
	if (vScore > 179e3) {
		level.html("Lv." + (vLevel = 4));
		tips.attr('max', 1).val(1);
	} else if (vScore > 86500) {
		level.html("Lv." + (vLevel = 3));
		tips.attr('max', 179e3).val(vScore);
	} else if (vScore > 23400) {
		level.html("Lv." + (vLevel = 2));
		tips.attr('max', 86500).val(vScore);
	} else {
		level.html("Lv." + (vLevel = 1));
		tips.attr('max', 23400).val(vScore);
	}
	return 0;
}

function aniReq() {
	if ((fps = (fps + 1) & 63) == 0) {
		if (remain-- > 0) {
			timer.html(remain);
		} else {
			sProgs = 9;
			var best = Math.max(vScore, localStorage.hook ? Number(localStorage.hook) : 0);
			localStorage.hook = best;
			$('#extra').css({"font-size":"64px", "padding":"7% 0", "z-index":999})
				.html("<table style='position:fixed;width:82%;left:9%;'>" +
					"<caption style='border-bottom:1px solid Cyan;'>~GAMEOVER~</caption>" +
					"<tr><td>TOP1SCORE</td><td id='top1'>...</td></tr>" +
					"<tr><td>BestScore</td><td>" + best + "</td></tr>" +
					"<tr><td>S C O R E</td><td>" + vScore + "</td></tr>" +
					"<tr><td>Accuracy </td><td>" + (accurate * 100 / Math.max(trytimes, 1)).toFixed(2) + "%</td></tr>" +
					"<tr><td colspan=2 style='text-align:center;'><a onClick='start();'>= Replay =</a></td></tr></table>").fadeIn(800);
			$.post("hook.php", { score: vScore }, function(re) { $('#top1').html(re); });
			return;
		}
	}
	
	if (--mvSteps >= 0) {
		pudge.css({"left":("+=" + vx), "top":("+=" + vy)});
	} else if (mvSteps == -1) {
		if (sQueue)	casting();
	} else	;
	
	switch (sProgs) {
	case 0:	break;
	case 1:
		skill.attr({x2:item[index][0], y2:item[index][1]});
		if ((item[index][0] - px) * (item[index][0] - px) + (item[index][1] - py) * (item[index][1] - py) > 1600) {
			if (index >= spot[vLevel]) {
				sProgs = 2;
				combo.html("Combo*" + (vCombo = 0));
			} else	index++;
		} else {
			sCatch = true;
			sProgs = 3;
			++accurate;
			var tmp = ~~(vSpeed * vSpeed * 41) + ((index * index + vLevel) << 4) + (Math.pow(vCombo, 3) << 3) + 379;
			combo.html("Combo*" + ++vCombo);
			score.html(vScore += tmp);	adjust();
			gacha.html("+" + tmp).css({left:(px - 64), top:(py - 36), opacity:.4}).animate({top:"-=49px", opacity:0}, 480, "linear");
		}
		break;
	case 2:
		if (index > 0) {
			skill.attr({x2:item[index][0], y2:item[index][1]});
			index--;
		} else {
			skill.attr({x1:0, y1:0, x2:0, y2:0});
			sProgs = 0;
		}
		break;
	case 3:
		if (index > 0) {
			skill.attr({x2:item[index][0], y2:item[index][1]});
			meats.attr({cx:(px = item[index][0]), cy:(py = item[index][1])});
			index--;
		} else {
			skill.attr({x1:0, y1:0, x2:0, y2:0});
			meats.attr({cx:(px = (.1 + Math.random() * .8) * maxw), cy:(py = (.1 + Math.random() * .8) * maxh)});
			mSpan = sProgs = 0;
			sCatch = false;
		}
		break;
	}
	
	if (cd < 0) {} else if (cd > 0) {
		dagger.clearRect(0, 0, 100, 100);
		dagger.beginPath();
		dagger.moveTo(50, 50);
		dagger.arc(50, 50, 100, Math.PI * (2 * (blink - --cd) / blink + 1.5), 1.5 * Math.PI);
		dagger.fill();
	} else {
		icon.animate({opacity:.1}, 128).animate({opacity:.9}, 128);	--cd;
	}
	
	if (!sCatch) {
		if (mSpan-- > 0) {
			if ((px < 20) || (px > maxw))	mx *= -1;
			if ((py < 20) || (py > maxh))	my *= -1;
			meats.attr({cx:(px += mx), cy:(py += my)});
		} else {
			var sx = (Math.random() - .5) * maxspeed[vLevel];
			mx = (sx < 0) ? (sx - minspeed[vLevel]) : (sx + minspeed[vLevel]);
			var sy = (Math.random() - .5) * maxspeed[vLevel];
			my = (sy < 0) ? (sy - minspeed[vLevel]) : (sy + minspeed[vLevel]);
			speed.html("MS:" + ~~((vSpeed = Math.sqrt(mx * mx + my * my)) * 59));
			mSpan = resetime[vLevel];
		}
	}
	window.requestAnimationFrame(aniReq);
	return;
}

function casting() {
	++trytimes;
	sQueue = false;
	var pos = pudge.position();
	var deg = Math.atan((sy - pos.top) / (sx -= pos.left));
	var phi = rang[vLevel] / spot[vLevel] * ((sx > 0) ? 1 : -1);
	sx = Math.cos(deg) * phi;
	sy = Math.sin(deg) * phi;
	sProgs = index = 1;
	for (var i = 1; i <= spot[vLevel]; i++) { item[i] = [pos.left + sx * i, pos.top + sy * i]; }
	skill.attr({x1:pos.left, y1:pos.top, x2:pos.left, y2:pos.top});
	return;
}

$(document).ready(function() {
	tips = $('progress');	body = $('body');
	gacha = $('#gacha');	speed = $('#speed');
	score = $('#score');	level = $('#level');
	combo = $('#combo');	timer = $('#timer');
	pudge = $('#pudge');	meats = $('#meats');
	icon = $('#dagger');	skill = $('#skill');
	dagger = document.getElementById('dagger').getContext("2d");
	var grd = dagger.createRadialGradient(50, 50, 10, 50, 50, 99);
	grd.addColorStop(0, "rgba(255,255,255,0)");
	grd.addColorStop(1, "rgba(64,192,192,1)");
	dagger.fillStyle = grd;
	$('*').css("margin", "0");
	$('b').css("color", "Yellow");
	body.children().css("position", "fixed");
	$('div').children().css("position", "relative");
	$(document).mousedown(function(event) {
		body.css("cursor", "auto");
		if (sProgs > 0)	return;
		sQueue = false;
		var pos = pudge.position();
		var dx = (sx = event.pageX) - pos.left;
		var dy = (sy = event.pageY) - pos.top;
		var dz = ~~Math.sqrt(dx * dx + dy * dy);
		if (event.button == 2) {
			mvSteps = dz >> 3;
			vx = dx / mvSteps;
			vy = dy / mvSteps;
		} else if (sPress == 1) {
			if (dz < rang[vLevel]) {
				mvSteps = -2;
				casting();
			} else {
				mvSteps = (dz - rang[vLevel]) >> 3;
				vx = (dx << 3) / dz;
				vy = (dy << 3) / dz;
				sQueue = true;
			}
		} else if (sPress == 2) {
			var gx = (dz < rang[0]) ? dx : (dx * rang[0] / dz);
			var gy = (dz < rang[0]) ? dy : (dy * rang[0] / dz);
			pudge.animate({left:("+=" + gx), top:("+=" + gy)}, 99, "linear");
			mvSteps = -2;	cd = blink;
		} else	;
		sPress = 0;
		return;
	});
	
	$(document).keypress(function(event) {
		if (event.which == 116) {
			body.css("cursor", "crosshair");
			sPress = 1;
		} else if ((cd < 0) && (event.which == 32)) {
			body.css("cursor", "cell");
			sPress = 2;
		} else {
			body.css("cursor", "auto");
			mvSteps = -2;
			sPress = 0;
			sQueue = false;
		}
		return;
	});
});

function start() {
	maxw = window.innerWidth - 20;
	maxh = window.innerHeight - 20;
	$('svg').attr({width:(maxw + 99), height:(maxh + 99)});
	skill.attr({x1:0, x2:0, y1:0, y2:0});
	body.children().css("z-index", "-1");
	for (var i = 0; i < 5; i++) { rang[i] = leng[i] * maxw * 0.064; }
	mx = 7 * Math.random();	my = 4 * Math.random();
	trytimes = accurate = sPress = sProgs = mvSteps = vCombo = 0;
	timer.html(remain = 60);
	score.html(vScore = 0);
	level.html("Lv." + (vLevel = 1));
	dagger.clearRect(0, 0, 100, 100);
	tips.attr('max', 1).val(0);
	fps = mSpan = 740;	cd = -1;
	sQueue = sCatch = false;
	$('#extra').fadeOut(600, function() {
		icon.css("opacity", ".9");
		speed.html("MS:" + Math.floor((vSpeed = Math.sqrt(mx * mx + my * my)) * 100));
		pudge.css({left:"6%", top:"84%", display:"block"});
		meats.attr({cx:(px = maxw * Math.random()), cy:(py = maxh * Math.random())}).css("display", "block");
		window.requestAnimationFrame(aniReq);
		return;
	});
	return;
}
