const app = document.querySelector('#app');
let questions = [];
let dimensions = [];
let answers = [];
let current = 0;
let busy = false;
let accessToken = localStorage.getItem('quiz_access_token');
let completed = 0;
const labels = ['非常不同意', '比较不同意', '不确定', '比较同意', '非常同意'];
const icons = ['◎', '◇', '⚖', '▦', '✦', '♡'];
const typeGroups = [
  {name: '分析者', code: 'NT', symbol: '✧', description: '以理性、洞察与策略，理解世界并改进它。', types: [
    ['INTJ', '战略建筑师', '着眼长远，善于规划，用系统思维设计更有效的未来。'],
    ['INTP', '逻辑探索者', '由好奇心驱动，喜欢拆解问题，寻找更深层的原理。'],
    ['ENTJ', '指挥统筹者', '目标明确，果断高效，擅长整合资源推动事情发生。'],
    ['ENTP', '创意辩论家', '思维活跃，乐于挑战既有观点，在碰撞中激发新可能。']
  ]},
  {name: '外交家', code: 'NF', symbol: '❋', description: '关注人与关系的意义，在连接与理解中创造改变。', types: [
    ['INFJ', '愿景倡导者', '敏锐而有原则，愿意为重要的信念和他人的成长投入。'],
    ['INFP', '温柔理想家', '重视内心价值，以真诚和想象力寻找属于自己的道路。'],
    ['ENFJ', '共情引领者', '善于看见他人的潜力，愿意把人们凝聚在一起。'],
    ['ENFP', '灵感发起者', '热情而富有想象，喜欢探索新想法与新的连接。']
  ]},
  {name: '守护者', code: 'SJ', symbol: '▣', description: '以责任、秩序与稳定，让日常生活可靠地运转。', types: [
    ['ISTJ', '秩序践行者', '认真务实，重视承诺，习惯把重要的事稳稳做好。'],
    ['ISFJ', '细心守护者', '体贴可靠，关注细节，常以实际行动照顾身边的人。'],
    ['ESTJ', '高效执行者', '直率有序，擅长建立规则并推动团队落实目标。'],
    ['ESFJ', '温暖协调者', '乐于支持他人，善于营造合作和被看见的氛围。']
  ]},
  {name: '探索者', code: 'SP', symbol: '✳', description: '灵活、敏锐、注重体验，在行动中发现机会。', types: [
    ['ISTP', '冷静实践家', '擅长观察和动手解决问题，享受弄清事物如何运作。'],
    ['ISFP', '自在创作者', '感受细腻，珍惜当下，常从生活中发现独特的美。'],
    ['ESTP', '敏捷行动派', '反应迅速，敢于尝试，善于抓住眼前的机会。'],
    ['ESFP', '活力体验者', '热情开朗，乐于分享，让平凡时刻也充满生气。']
  ]}
];
const profiles = {
  INTJ: ['擅长把复杂目标拆成长期策略，并持续优化路径。', '可能过早否定尚未成形的想法，也容易把标准设得太高。', '更珍惜坦诚、独立与深入的交流，需要自己的思考空间。', '在提出方案前，先听听别人对过程和情绪的感受。'],
  INTP: ['喜欢追问原理，能从看似无关的信息中发现新解释。', '想法很多时，可能迟迟不愿意定案或开始执行。', '喜欢能讨论观点又尊重自由的关系，不爱被催促表态。', '给重要想法设一个小截止时间，用行动检验推理。'],
  ENTJ: ['能够明确方向、组织资源，带领团队推进棘手任务。', '追求效率时，可能忽略他人的节奏和参与感。', '欣赏直接沟通与共同成长，也愿意为重要的人承担责任。', '把倾听当成决策的一部分，让伙伴参与定义目标。'],
  ENTP: ['善于发现旧问题的新解法，让讨论变得有活力。', '新鲜感过去后，可能难以坚持收尾或照顾细节。', '喜欢有思想碰撞的关系，幽默和好奇是你的连接方式。', '选定一个最重要的点子，投入足够时间把它完成。'],
  INFJ: ['能读懂深层需求，并把理想转化为有方向的行动。', '过度照顾他人时，可能忽视自己的边界与疲惫。', '偏好真诚而有深度的连接，会认真对待信任。', '练习明确说出自己的需要，不必等别人猜到。'],
  INFP: ['拥有鲜明的个人价值和细腻的感受力，能看见独特可能。', '理想与现实有落差时，可能陷入自我怀疑或拖延。', '重视被理解和自由表达，也愿意倾听他人的故事。', '把重要的理想拆成一步能完成的小行动。'],
  ENFJ: ['善于鼓励和凝聚人，让合作有目标也有温度。', '习惯承担太多时，可能把别人的期待当成自己的责任。', '主动表达关心，喜欢一起成长的亲密关系。', '留一些精力给自己，允许别人独立处理自己的问题。'],
  ENFP: ['能快速看见机会、连接人和想法，带来新的活力。', '可能同时开启太多方向，难以稳定投入。', '热爱真诚和新鲜感，希望关系中保有探索空间。', '把灵感写成可执行的下一步，并定期回看进度。'],
  ISTJ: ['做事可靠、有条理，能让重要承诺稳稳落地。', '过度依赖熟悉的方法时，可能错过更轻松的做法。', '以行动表达在乎，重视信任、责任与稳定。', '在改变来临时，先尝试一个小实验，再判断是否适合。'],
  ISFJ: ['细致地察觉他人的需要，愿意提供持续而实际的支持。', '总是先照顾别人时，自己的需求容易被放到最后。', '温和而忠诚，喜欢让亲近的人感到安心。', '练习提出请求，让关心也能双向流动。'],
  ESTJ: ['能建立清晰规则、分配任务，并推动计划落实。', '太快进入解决问题模式，可能让人感到被忽略。', '重视承诺与坦率，用可靠的行动支持关系。', '在给出建议前先问一句：你更需要倾听还是方案？'],
  ESFJ: ['善于照顾群体氛围，让人们更容易合作与融入。', '过于在意他人的评价时，可能难以做出自己的选择。', '喜欢及时表达关心，也重视被回应和被认可。', '给自己留一点不取悦任何人的时间，确认真实愿望。'],
  ISTP: ['观察敏锐，遇到实际问题时能迅速找到可行办法。', '习惯独自处理事情，可能让别人不知道你的想法。', '尊重彼此空间，喜欢自然、不被过度安排的相处。', '在关键时刻多说一句你的判断和计划。'],
  ISFP: ['感受细腻，能发现日常中的美与真实体验。', '不愿引发冲突时，可能压下自己的立场。', '在关系中温柔而真诚，重视当下的相处感受。', '把喜欢与不喜欢说清楚，让别人更了解你。'],
  ESTP: ['敢于行动，能在变化中快速判断并抓住机会。', '追求即时反馈时，可能低估长期后果。', '喜欢直接、轻松、充满体验感的互动。', '对重要决定留一段冷静时间，检查风险与承诺。'],
  ESFP: ['擅长带动气氛，愿意把热情和快乐分享给别人。', '忙于回应眼前需求时，可能忽略自己的长期目标。', '乐于陪伴，喜欢真实、活泼且彼此支持的关系。', '为自己设一个小而清晰的长期目标，持续投入。']
};
const typeVariants = [
  {code: 'A-C', name: '果断平和', description: '你倾向于先明确方向，再用平稳、清晰的方式表达原则和边界。'},
  {code: 'A-H', name: '果断热烈', description: '你倾向于先推动想法，也会鲜明表达投入、热情与在意。'},
  {code: 'O-C', name: '审慎平和', description: '你倾向于先比较选项与风险，再冷静地说明判断和界限。'},
  {code: 'O-H', name: '审慎热烈', description: '你倾向于先认真权衡，同时直接表达情绪和重视的事情。'}
];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
}

async function api(path, options) {
  const response = await fetch(`/mbti${path}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '请求失败，请稍后重试。');
  return data;
}

function renderHome() {
  document.documentElement.classList.remove('quiz-active');
  document.title = '人格罗盘 · 六维人格探索测验';
  document.querySelector('nav').hidden = false;
  document.querySelector('.start-button').hidden = false;
  app.innerHTML = `<section class="hero" id="about"><div class="hero-copy"><p class="hero-index">01 / 探索自我</p><h1>认识自己，<br>从一次真诚的<br><em>回答开始。</em></h1><p class="hero-description">36 道日常情境题，探索你的六维人格倾向。没有标准答案，只有更清晰的自己。</p><div class="hero-actions"><button class="button start-button" type="button">开始探索 <span aria-hidden="true">↗</span></button><div class="stat"><span>已完成人数</span><strong id="people-count">${completed.toLocaleString('zh-CN')}</strong></div></div><p class="hero-note">约需 7 分钟 · 免费体验 · 无需注册</p></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><div class="compass"><span>✦</span></div><div class="art-label label-top">DISCOVER</div><div class="art-label label-bottom">YOUR TRUE NORTH</div></div></section><section class="dimensions-section" id="dimensions"><div class="section-heading"><div><p class="section-number">02 / 六维度</p><h2>探索你的六维人格</h2></div><p>从六个关键维度，描绘你独特的思考、行动与表达方式。</p></div><div class="dimension-grid">${dimensions.map((d, i) => `<article class="dimension-card"><span class="dimension-icon tint-${i % 2}">${icons[i]}</span><div><span class="dimension-code">${d.key.split('').join(' / ')}</span><h3>${escapeHtml(d.title)}</h3><p>${escapeHtml(d.description)}</p></div><span class="card-arrow" aria-hidden="true">↗</span></article>`).join('')}</div></section><section class="closing"><span>YOUR STORY STARTS HERE</span><h2>你的答案，值得被认真倾听。</h2><button class="button start-button" type="button">开始测验 <span aria-hidden="true">→</span></button></section>`;
  app.querySelectorAll('.start-button').forEach(button => button.addEventListener('click', startQuiz));
  app.querySelector('.dimensions-section').insertAdjacentHTML('beforeend', '<a class="types-link" href="/mbti/types">浏览 64 种人格类型 <span aria-hidden="true">↗</span></a>');
}

function renderTypes() {
  document.documentElement.classList.remove('quiz-active');
  document.title = '人格类型图鉴 · 人格罗盘';
  document.querySelector('nav').hidden = false;
  document.querySelector('.site-header > .start-button').hidden = false;
  app.innerHTML = `<section class="types-hero"><div class="types-hero-art" aria-hidden="true">✦</div><p class="section-number">PERSONALITY ATLAS</p><h1>探索 <em>64</em> 种人格类型</h1><p>16 种基础人格，各自延伸出四种自我态度与情绪表达组合。<br>同一基础类型，也可以有不同的行动节奏与表达方式。</p><button class="button start-button" type="button">开始测验 <span aria-hidden="true">→</span></button></section><div class="types-content">${typeGroups.map((group, groupIndex) => `<section class="type-group group-${groupIndex}"><div class="type-group-heading"><span class="group-symbol" aria-hidden="true">${group.symbol}</span><div><span class="dimension-code">${group.code} SERIES</span><h2>${group.name}</h2></div><p>${group.description}</p></div><div class="type-grid">${group.types.flatMap(([baseCode, name, description], i) => typeVariants.map(variant => { const code = `${baseCode}-${variant.code}`; return `<article class="type-card" id="type-${code}"><div class="type-art art-${groupIndex}-${i}" aria-hidden="true"><span>${icons[(groupIndex * 4 + i) % icons.length]}</span><i></i><b></b></div><div class="type-card-body"><span class="type-code">${code}</span><h3>${name} · ${variant.name}</h3><p>${description} ${variant.description}</p></div></article>`; })).join('')}</div></section>`).join('')}</div><section class="closing"><span>YOUR STORY STARTS HERE</span><h2>哪一种描述更像你？</h2><button class="button start-button" type="button">开始测验 <span aria-hidden="true">→</span></button></section>`;
  app.querySelectorAll('.start-button').forEach(button => button.addEventListener('click', startQuiz));
  app.querySelectorAll('.type-card').forEach(card => {
    const code = card.querySelector('.type-code').textContent;
    card.querySelector('.type-art').removeAttribute('aria-hidden');
    card.querySelector('.type-art span').setAttribute('aria-hidden', 'true');
    const image = document.createElement('img');
    image.src = `/mbti/portraits/${code.slice(0, 4)}.webp`;
    image.alt = `${card.querySelector('h3').textContent}的人格插画`;
    image.loading = 'lazy';
    card.querySelector('.type-art').append(image);
  });
  if (location.hash.startsWith('#type-')) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}

function openKeyDialog() {
  const dialog = document.querySelector('#key-dialog');
  const input = document.querySelector('#key-input');
  document.querySelector('#key-error').textContent = '';
  input.value = '';
  dialog.showModal();
  input.focus();
}

async function startQuiz() {
  if (accessToken) {
    try {
      const quiz = await api('/api/questions', {headers: {'Authorization': `Bearer ${accessToken}`}});
      questions = quiz.questions;
      dimensions = quiz.dimensions;
      beginQuiz();
      return;
    } catch {
      accessToken = null;
      localStorage.removeItem('quiz_access_token');
    }
  }
  openKeyDialog();
}

function beginQuiz() {
  if (!questions.length) return;
  document.documentElement.classList.add('quiz-active');
  answers = Array(questions.length).fill(null);
  current = 0;
  document.querySelector('nav').hidden = true;
  document.querySelector('.site-header > .start-button').hidden = true;
  renderQuestion();
  window.scrollTo(0, 0);
}

function renderQuestion() {
  const question = questions[current];
  const selected = answers[current];
  app.innerHTML = `<section class="quiz-shell"><div class="quiz-top"><button class="text-button" id="quit" type="button">← 返回首页</button><span>请按第一直觉作答</span></div><div class="quiz-card"><div class="progress-head"><span>问题 <strong>${String(current + 1).padStart(2, '0')}</strong> / ${questions.length}</span><span>${Math.round(current / questions.length * 100)}%</span></div><div class="progress-track"><div style="width:${current / questions.length * 100}%"></div></div><p class="quiz-dimension">${escapeHtml(dimensions.find(d => d.key === question.dimension).title)}</p><h1 tabindex="-1">${escapeHtml(question.text)}</h1><p class="quiz-hint">这句话与你有多符合？</p><div class="choices" role="radiogroup" aria-label="请选择符合程度">${labels.map((label, i) => `<button type="button" class="choice ${selected === i + 1 ? 'selected' : ''}" role="radio" aria-checked="${selected === i + 1}" data-value="${i + 1}"><span class="choice-radio"></span><span>${label}</span><span class="choice-number">0${i + 1}</span></button>`).join('')}</div><div class="quiz-actions"><button class="outline-button" id="previous" type="button" ${current === 0 ? 'disabled' : ''}>← 上一题</button><button class="button" id="next" type="button" ${selected === null || busy ? 'disabled' : ''}>${current === questions.length - 1 ? '查看结果' : '下一题 →'}</button></div><p class="quiz-error" role="alert"></p></div><p class="quiz-footer">每一个答案，都让画像更接近真实的你。</p></section>`;
  app.querySelector('#quit').onclick = location.pathname === '/mbti/types' ? renderTypes : renderHome;
  app.querySelector('#previous').onclick = () => { current--; renderQuestion(); window.scrollTo(0, 0); app.querySelector('.quiz-card h1').focus({preventScroll: true}); };
  app.querySelectorAll('.choice').forEach(button => button.onclick = () => {
    answers[current] = Number(button.dataset.value);
    app.querySelectorAll('.choice').forEach(choice => {
      const active = choice === button;
      choice.classList.toggle('selected', active);
      choice.setAttribute('aria-checked', String(active));
    });
    app.querySelector('#next').disabled = false;
  });
  app.querySelector('#next').onclick = async () => {
    if (current < questions.length - 1) { current++; renderQuestion(); window.scrollTo(0, 0); app.querySelector('.quiz-card h1').focus({preventScroll: true}); return; }
    if (busy) return;
    busy = true;
    const next = app.querySelector('#next');
    next.disabled = true;
    next.textContent = '正在生成结果…';
    try {
      let id = localStorage.getItem('personality_participant_id');
      if (!id) { id = crypto.randomUUID(); localStorage.setItem('personality_participant_id', id); }
      const result = await api('/api/assessments', {method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}`}, body: JSON.stringify({participant_id: id, answers})});
      completed = result.completed_people;
      renderResult(result);
    } catch (error) {
      app.querySelector('.quiz-error').textContent = `结果保存失败：${error.message}`;
      next.disabled = false;
      next.textContent = '重试提交';
    } finally { busy = false; }
  };
}

function renderResult(result) {
  const code = escapeHtml(result.code);
  const baseType = result.code.slice(0, 4);
  const type = typeGroups.flatMap(group => group.types).find(item => item[0] === baseType);
  const variant = typeVariants.find(item => item.code === result.code.slice(5));
  const profile = profiles[baseType];
  app.innerHTML = `<section class="result-shell"><div class="result-intro"><p class="section-number">你的六维人格画像</p><div class="result-symbol">✦</div><h1>${code}</h1><p>这是此刻的你，在六个维度上的倾向。人格不是标签，它是继续了解自己的起点。</p><div class="result-stat">已有 <strong>${result.completed_people.toLocaleString('zh-CN')}</strong> 人完成探索</div></div><div class="result-content"><div class="section-heading"><div><p class="section-number">YOUR DIMENSIONS</p><h2>逐一读懂你的倾向</h2></div></div><div class="result-grid">${result.dimensions.map(d => { const position = 100 - d.percent; return `<article class="result-card"><div class="result-card-head"><span>${escapeHtml(d.title)}</span><strong>${escapeHtml(d.chosen)}${d.percent === 50 ? ' · 接近均衡' : ''}</strong></div><div class="trait-labels"><span>${escapeHtml(d.first)}</span><span>${escapeHtml(d.second)}</span></div><div class="trait-track"><div style="width:${position}%"></div><span style="left:${position}%"></span></div><p>${escapeHtml(d.description)}</p></article>`; }).join('')}</div><div class="result-actions"><button class="button" id="restart" type="button">重新测验 ↗</button><button class="outline-button" id="home" type="button">返回首页</button></div><p class="result-disclaimer">倾向接近均衡时，代码按固定规则归类；本结果仅供自我探索，不作为医学、心理诊断或职业决策依据。</p></div></section>`;
  app.querySelector('#restart').onclick = startQuiz;
  app.querySelector('#home').onclick = () => { location.href = '/mbti/'; };
  app.querySelector('.result-symbol').outerHTML = `<div class="result-portrait"><img src="/mbti/portraits/${baseType}.webp" alt="${escapeHtml(type[1])}的人格插画"></div>`;
  app.querySelector('.result-intro h1').insertAdjacentHTML('afterend', `<p class="result-type-name">${escapeHtml(type[1])} · ${escapeHtml(variant.name)}型</p>`);
  const relationStyle = result.code.endsWith('-H') ? '热烈表达会让身边的人感受到你的投入，也记得留意对方接收信息的节奏。' : '平和表达让判断与边界更清晰，也可以适时说出自己的感受。';
  const actionStyle = result.code.includes('-A-') ? '你的自我态度偏果断，可能在信息不完整时也愿意先行动。' : '你的自我态度偏审慎，先核对关键条件再推进会让你更安心。';
  app.querySelector('.result-content .section-heading').insertAdjacentHTML('beforebegin', `<section class="profile-section"><p class="section-number">PERSONALITY PORTRAIT</p><h2>你的专属人格画像</h2><p class="profile-summary">${escapeHtml(type[2])} ${escapeHtml(variant.description)} ${escapeHtml(actionStyle)} ${escapeHtml(relationStyle)}</p><div class="profile-grid">${[['核心优势', profile[0]], ['可能的盲点', profile[1]], ['关系中的你', `${profile[2]} ${relationStyle}`], ['成长建议', `${profile[3]} ${actionStyle}`]].map(([title, content], i) => `<article class="profile-card"><span class="profile-card-icon" aria-hidden="true">${['✦', '◌', '♡', '↗'][i]}</span><h3>${title}</h3><p>${escapeHtml(content)}</p></article>`).join('')}</div></section>`);
  app.querySelector('.result-actions').insertAdjacentHTML('beforeend', `<a class="outline-button" href="/mbti/types#type-${result.code}">查看对应类型</a>`);
  window.scrollTo(0, 0);
  document.documentElement.classList.remove('quiz-active');
}

document.querySelector('#key-dialog').addEventListener('cancel', event => event.preventDefault());
document.querySelector('#key-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = document.querySelector('#key-input');
  const submit = document.querySelector('#key-submit');
  const error = document.querySelector('#key-error');
  if (!input.value) { error.textContent = '\u8bf7\u8f93\u5165 KEY\u3002'; input.focus(); return; }
  submit.disabled = true;
  submit.textContent = '\u6b63\u5728\u9a8c\u8bc1\u2026';
  error.textContent = '';
  try {
    const result = await api('/api/verify-key', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({key: input.value})});
    accessToken = result.token;
    localStorage.setItem('quiz_access_token', accessToken);
    const quiz = await api('/api/questions', {headers: {'Authorization': `Bearer ${accessToken}`}});
    questions = quiz.questions;
    dimensions = quiz.dimensions;
    document.querySelector('#key-dialog').close();
    beginQuiz();
  } catch (err) {
    if (accessToken) {
      accessToken = null;
      localStorage.removeItem('quiz_access_token');
    }
    error.textContent = err.message.includes('KEY') ? 'KEY \u4e0d\u6b63\u786e\uff0c\u8bf7\u8f93\u5165\u6b63\u786e\u7684 KEY\u3002' : `\u6682\u65f6\u65e0\u6cd5\u5f00\u59cb\u6d4b\u9a8c\uff1a${err.message}`;
    input.focus();
    input.select();
  } finally {
    submit.disabled = false;
    submit.textContent = '\u9a8c\u8bc1\u5e76\u5f00\u59cb\u6d4b\u9a8c';
  }
});

document.querySelector('.site-header > .start-button').addEventListener('click', startQuiz);
document.querySelector('.site-header > .start-button').disabled = true;
Promise.all([api('/api/dimensions'), api('/api/stats')]).then(([publicData, stats]) => {
  dimensions = publicData.dimensions;
  completed = stats.completed_people;
  document.querySelector('.site-header > .start-button').disabled = false;
  if (location.pathname === '/mbti/types') renderTypes(); else renderHome();
}).catch(error => {
  app.innerHTML = `<section class="load-error"><h1>暂时无法加载测验</h1><p>${escapeHtml(error.message)}</p><button class="button" onclick="location.reload()">重新加载</button></section>`;
});
