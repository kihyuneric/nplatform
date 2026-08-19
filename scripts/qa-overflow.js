/**
 * 모바일 가로스크롤 점검 스니펫 (브라우저 콘솔에 붙여 실행)
 *
 * 화면 밖으로 삐져나가 가로스크롤을 만드는 요소를 찾아낸다.
 * 표(table)는 overflow-x:auto 래퍼 안에 있으면 정상으로 본다.
 */
(() => {
  const vw = document.documentElement.clientWidth
  const bad = []
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    if (r.right <= vw + 1 && r.left >= -1) continue
    // 스크롤 가능한 조상이 있으면 의도된 가로스크롤 (표 등)
    let p = el.parentElement, scrollable = false
    while (p && p !== document.body) {
      const ox = getComputedStyle(p).overflowX
      if (ox === 'auto' || ox === 'scroll') { scrollable = true; break }
      p = p.parentElement
    }
    if (scrollable) continue
    bad.push({
      tag: el.tagName.toLowerCase(),
      cls: String(el.className || '').slice(0, 70),
      left: Math.round(r.left),
      right: Math.round(r.right),
      over: Math.round(r.right - vw),
    })
  }
  // 부모-자식 중복 제거: 가장 크게 삐져나간 것부터
  bad.sort((a, b) => b.over - a.over)
  return { vw, docScrollW: document.documentElement.scrollWidth, count: bad.length, top: bad.slice(0, 8) }
})()
