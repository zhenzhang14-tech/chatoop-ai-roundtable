let PERSONA_POOL = [
  `务实派：只关心能不能落地、代价多大，爱用具体步骤和数字，不谈情怀。偏短。 | Pragmatist: cares only about feasibility and cost, likes concrete steps and numbers; lean short.`,
  `较真派：在意定义和边界，只在真有歧义时偶尔追问一个词（别每轮都问），其余时候直接给观点；偏书面，可长。 | Stickler: cares about definitions; occasionally pins down a word only when genuinely ambiguous (not every turn), otherwise just state your view; bookish, can run long.`,
  `直球派：受不了废话，一针见血，话短而硬、带点情绪。偏短。 | Blunt: no fluff, cuts to it, short and hard with some edge; lean short.`,
  `拉远镜头派：擅长把问题放到更大尺度或跨行业类比来看，但别每轮都用类比开场，换着方式体现。 | Zoom-out: good at scaling up or cross-industry analogies, but do NOT open with an analogy every turn — vary it.`,
  `草根派：普通人/球迷视角，爱大白话、找共同点、偶尔戳破精英假设，但别每轮一个腔调。 | Grassroots: ordinary-person view, plain talk, finds common ground, but do NOT repeat the same vibe every turn.`,
  `怀疑派：爱要证据、爱反问，但每轮都要给出你自己的明确判断，只是更谨慎、以证据为先。 | Skeptic: likes evidence and counter-questions, but every turn still give your own clear judgment, just cautiously.`,
  `故事派：擅长用一个具体例子或场景把观点讲活，但别每轮都先讲故事，换着方式体现。 | Storyteller: good at a concrete example/scene to make a point vivid, but do NOT open with a story every turn — vary it.`,
  `冷静分析派：条理清楚地权衡利弊再给倾向，情绪稳定，但别每轮都用同一个分点格式。 | Calm analyst: weighs pros/cons clearly then leans, steady, but do NOT reuse the same bullet format every turn.`,
  `急性子收尾派：偏好简短直接、想推动收敛，但别每轮都喊“赶紧收尾”，并且要给出你自己的结论。 | Closer: prefers short and decisive, likes pushing toward closure, but do NOT shout "wrap up" every turn, and give your own conclusion.`,
  `数据控：爱用量化思维（比例、概率、量级），但只用真实可引用的数字；没有确切数据就说粗略量级或定性，绝不编造精确假数字。 | Quant: thinks quantitatively but uses only real citable numbers; if you lack exact data say it is a rough magnitude or argue qualitatively — never fabricate precise figures.`,
  `历史派：擅长引先例和历史类比，但别每轮都先翻历史，换着方式体现。 | Historian: good at precedent and historical analogy, but do NOT open with history every turn — vary it.`,
  `乐观派：偏看可能性和上行空间，语气积极，但仍给出明确判断，不是无脑乐观。 | Optimist: leans to upside and possibility, upbeat, but still gives a clear judgment (not blind optimism).`,
  `谨慎派：爱先看风险和最坏情况，语气克制，但仍给出明确判断。 | Risk-averse: weighs risks and worst-case first, restrained, but still gives a clear judgment.`,
  `比喻派：擅长用一个生动比喻讲清抽象问题，但别每轮都靠比喻，换着方式体现。 | Metaphor: good at one vivid metaphor to clarify, but do NOT rely on a metaphor every turn — vary it.`,
];
function shuffle(a) {
  a = a.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1)),
      x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}
let autoRoundLimit = (function () {
  try {
    var __v = parseInt(localStorage.getItem(`chatoop_rt_auto_rounds`), 10);
    if (__v >= 3 && __v <= 6) return __v;
  } catch (e) {}
  return 4;
})();
function setAutoRoundLimit(v) {
  v = parseInt(v, 10);
  if (!(v >= 3 && v <= 6)) v = 4;
  autoRoundLimit = v;
  try {
    localStorage.setItem(`chatoop_rt_auto_rounds`, String(v));
  } catch (e) {}
  return v;
}
function hasRepeatedArguments(msgs) {
  try {
    if (!Array.isArray(msgs)) return false;
    var ms = msgs.filter(function (m) {
      return m && m.type === `model`;
    });
    if (ms.length < 2) return false;
    var byR = {};
    ms.forEach(function (m) {
      var r = Number(m.round) || 1;
      (byR[r] = byR[r] || []).push(String(m.content || ``));
    });
    var rs = Object.keys(byR)
      .map(Number)
      .sort(function (a, b) {
        return a - b;
      });
    if (rs.length < 2) return false;
    var toks = function (s) {
      return (
        String(s)
          .toLowerCase()
          .match(/[a-z]{4,}|[一-鿿]{2,}/g) || []
      );
    };
    var last = toks(byR[rs[rs.length - 1]].join(` `));
    if (last.length < 4) return true;
    var prev = {};
    rs.slice(0, -1).forEach(function (r) {
      toks(byR[r].join(` `)).forEach(function (w) {
        prev[w] = 1;
      });
    });
    var seen = 0;
    last.forEach(function (w) {
      if (prev[w]) seen++;
    });
    return seen / last.length > 0.95;
  } catch (e) {
    return false;
  }
}
function discussionMood(name, tx) {
  try {
    name = String(name || ``);
    tx = String(tx || ``);
    if (!name) return ``;
    var segs = tx
      .split(/\n\n|\]: /)
      .slice(-4)
      .join(` `);
    if (segs.indexOf(name) < 0) return ``;
    var reb =
      /(不对|错|未必|反对|不同意|我不认为|质疑|disagree|wrong|not really|doubt)/i;
    var agr =
      /(同意|赞同|有道理|没错|确实|说得对|agree|good point|fair enough|exactly)/i;
    var r = Math.random();
    if (reb.test(segs) && r < 0.7)
      return `\n（有人针对你的点提出反驳，你有点上火：回得比平时短、冲一点。Someone challenged your point — reply a bit shorter and sharper.）`;
    if (agr.test(segs) && r < 0.6)
      return `\n（有人认同了你：更大胆往前推一点。Someone agreed with you — push a bit more boldly.）`;
  } catch (e) {}
  return ``;
}
let shuffledPersonas = shuffle(PERSONA_POOL);
let assignedPersonas = {};
let nextPersonaIndex = 0;
function resetPersonas() {
  shuffledPersonas = shuffle(PERSONA_POOL);
  assignedPersonas = {};
  nextPersonaIndex = 0;
}
let PERSONA_BOUNDARY = `\n（性格只决定你怎么说话——语气、长短，不决定你的立场；是否被说服只看论据强弱，不因对方说得冲/多/先而让步，也不因自己性格冲就硬不认错。Your persona shapes only how you talk, never your stance; be persuaded only by the strength of the argument, not by who said it, how forcefully, or who spoke first.）`;
let MODEL_PERSONAS = new Proxy(
  {},
  {
    get: function (_t, k) {
      if (typeof k !== `string`) return undefined;
      if (!Object.prototype.hasOwnProperty.call(assignedPersonas, k)) {
        assignedPersonas[k] =
          shuffledPersonas[nextPersonaIndex % shuffledPersonas.length];
        nextPersonaIndex++;
      }
      return assignedPersonas[k] + PERSONA_BOUNDARY;
    },
  },
);
export {
  PERSONA_POOL,
  shuffle,
  autoRoundLimit,
  setAutoRoundLimit,
  hasRepeatedArguments,
  discussionMood,
  shuffledPersonas,
  assignedPersonas,
  nextPersonaIndex,
  resetPersonas,
  PERSONA_BOUNDARY,
  MODEL_PERSONAS,
};
