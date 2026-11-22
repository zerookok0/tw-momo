/* 分类页 Banner 轮播：3 张、左右箭头、圆点、4s 自动切换 */
(function () {
  var track = document.getElementById('catTrack');
  var dots = document.getElementById('catDots');
  var box = document.getElementById('catBanner');
  if (!track || !box) return;
  var n = track.children.length, cur = 0;
  function go(i) {
    cur = (i + n) % n;
    track.style.transform = 'translateX(' + (-cur * 100) + '%)';
    if (dots) [].forEach.call(dots.children, function (d, k) { d.className = k === cur ? 'on' : ''; });
  }
  var p = box.querySelector('.prev'), q = box.querySelector('.next');
  if (p) p.addEventListener('click', function () { go(cur - 1); });
  if (q) q.addEventListener('click', function () { go(cur + 1); });
  if (dots) [].forEach.call(dots.children, function (d, k) { d.addEventListener('click', function () { go(k); }); });
  setInterval(function () { go(cur + 1); }, 4000);
})();