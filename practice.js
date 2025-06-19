// practice_experiment.js

// Two-Step Task の練習版アプリケーション
// 課題構造のインストラクションと、数試行の練習を行います。報酬ポイントは練習中は本試験に影響しません。

// --- 初期設定 ---
let total_reward = 0;
let total_points = 0;

// jsPsych 初期化
const jsPsych = initJsPsych();

// フォントサイズ設定
const TEXT_SIZE = '24px';
const SYMBOL_SIZE = '120px';

// 練習用報酬確率の初期値
let reward_probs = { state0: [0.5, 0.5], state1: [0.5, 0.5] };
const step_size = 0.025;
const reward_bounds = [0.25, 0.75];

// 正規乱数生成関数
function normalRandom(mean = 0, std = 1) {
  let u = Math.random(), v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// 報酬確率更新関数
function updateRewardProbs() {
  ['state0', 'state1'].forEach(state => {
    reward_probs[state] = reward_probs[state].map(p => {
      const new_p = Math.min(
        Math.max(p + normalRandom(0, step_size), reward_bounds[0]),
        reward_bounds[1]
      );
      return new_p;
    });
  });
}

// --- タイムライン定義 ---
const timeline = [];

// ベースライン（注視ターゲット）の定義
const baseline = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: '<div style="font-size:48px; text-align:center;">+</div>',
  choices: [],
  trial_duration: 1000
};

// 1. インストラクション（課題構造の説明）
const instructions = [
  // 全体イントロ（スペースキー）
  {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div style="padding:40px 20px; font-size:${TEXT_SIZE}; text-align:center; margin-bottom:40px;">
        <p>ようこそ！このタスクは、一試行当たり2段階の選択と、時折記憶テストがあります。</p>
        <p>次へ進むにはスペースキーを押してください。</p>
      </div>
    `,
    choices: [' ']
  },
  // ステージ1 説明＋練習
  {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: 
 `<div style="font-size:${TEXT_SIZE}">
<p>ステージ1では、2つのシンボルのうちどちらかを、左ならば F、右ならば J のキーを押して選択します。</p>
        <p>ここでは試しに F を押してみてください。</p>
<p>ステージ1</p>` +
                `<div style="font-size:${SYMBOL_SIZE};margin:20px 0;">🔴　　🔵</div>` +
                `<p>左: Fキー | 右: Jキー</p></div>`,
    choices: ['f']
  },
  // ステージ2 説明＋練習
  {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: 
`<div style="font-size:${TEXT_SIZE}">
<p>ステージ2でも、2つのシンボルから一方を選択すると、それぞれのシンボルに対して設定された確率に沿って1または0ポイントの報酬が提示されます。</p>
        <p>ここでは試しに F を押してみてください。</p>
<p>ステージ2</p>` +
                `<div style="font-size:${SYMBOL_SIZE};margin:20px 0;">🟢　　🟡</div>` +
                `<p>左: Fキー | 右: Jキー</p></div>`,
    choices: ['f']
  },
  // 報酬提示練習
  {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div style="padding:40px 20px; font-size:${TEXT_SIZE}; text-align:center; margin-bottom:40px;">
        <p>報酬の有無が提示された後、ステージ1に戻ります。</p>
        <p>💰 報酬を得ました！</p>
        <p>次へ進むにはスペースキーを押してください。</p>
      </div>
    `,
    choices: [' ']
  },
  // ステージ1 再練習
  {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<div style="font-size:${TEXT_SIZE}">
<p>もう一度fを押してみてください。</p>
<p>ステージ1</p>` +
                `<div style="font-size:${SYMBOL_SIZE};margin:20px 0;">🔴　　🔵</div>` +
                `<p>左: Fキー | 右: Jキー</p></div>`,
    choices: ['f']
  },
  // 遷移構造説明＋練習
  {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: 
`<div style="font-size:${TEXT_SIZE}">
<p>実は、ステージ2では、ステージ1の選択に応じて2対のシンボルのうち1対が提示されます。</p>
        <p>どのシンボルの組が提示されるかは確率的に決まりますが、ステージ1の選択によって、どちらのシンボルの組が提示されやすいかは決まっています。</p>
        <p>この組み合わせの確率も学習していく必要があります。</p>
        <p>ここでは F または J を押してみてください。</p>
<p>ステージ2</p>` +
                `<div style="font-size:${SYMBOL_SIZE};margin:20px 0;">🟣　　🟠</div>` +
                `<p>左: Fキー | 右: Jキー</p></div>`
,
    choices: ['f','j']
  },
  // 記憶賭けテスト説明
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="padding:40px 20px; font-size:${TEXT_SIZE}; text-align:left; margin-bottom:40px;">
        <p>また、時折挟まる記憶テストでは直近のステージ1で選択したシンボルを思い出してもらいます。</p>
        <p>回答にポイントを賭けると、正解→+1、不正解→-1。賭けないと±0です。</p>
      </div>
    `,
    choices: ['次へ']
  },
  // 2. ステージ1 操作説明と練習（Fキーのみ）
  {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<div style="font-size:${TEXT_SIZE}">
<p>直近のステージ1で選択したのは？</p>`
+`
<p>　</p>
` +
                `<div style="font-size:${SYMBOL_SIZE};margin:20px 0;">🔴　　🔵</div>` +
                `<p>左: Fキー | 右: Jキー</p></div>`,
    choices: ['f','j']
  },
  {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div style="font-size:${TEXT_SIZE}">
        <p>先ほどの回答に1ポイントを賭けますか？</p>
        <p>Y: はい　 N: いいえ</p>
      </div>
    `,
    choices: ['y','n']
  },
  // 練習開始
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="padding:40px 20px; font-size:${TEXT_SIZE}; text-align:center; margin-bottom:40px;">
        <p>それでは、練習を始めます！練習中の報酬は本試験に影響しません。</p>
      </div>
    `,
    choices: ['開始']
  }
];

timeline.push(...instructions);

// 2. 練習試行パラメータ
const practice_trials = 6;
const insert_memory = 3;  // 3回目の後に記憶賭け試行を挿入

for (let j = 0; j < practice_trials; j++) {
  // --- ステージ1 ---
  timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: 
`<div style="font-size:${TEXT_SIZE}"><p>ステージ1</p>` +
                `<div style="font-size:${SYMBOL_SIZE};margin:20px 0;">🔴　　🔵</div>` +
                `<p>左: Fキー | 右: Jキー</p></div>`
,
    choices: ['f', 'j'],
    data: { phase: 'practice', stage: 1, trial: j+1 },
    on_finish: function(data) {
      data.choice_stage1 = data.response === 'f' ? 0 : 1;
      data.state2 = data.choice_stage1;
    }
  });

  // --- ステージ2 ---
  timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function() {
      const prev = jsPsych.data.get()
        .filter({ phase:'practice', stage:1, trial:j+1 })
        .last(1).values()[0] || {};
      const state = prev.state2 || 0;
      const symbols_desc = '';
      const symbols = [['🟢','🟡'], ['🟣','🟠']];
      return `<div style="font-size:${TEXT_SIZE}"><p>ステージ2 - 状態 ${state}</p>` +
               `<div style="font-size:${SYMBOL_SIZE};margin:20px 0;">${symbols[state][0]}　　${symbols[state][1]}</div>` +
               `<p>左: Fキー | 右: Jキー</p></div>`;
    },
    choices: ['f', 'j'],
    data: { phase: 'practice', stage: 2, trial: j+1 },
    on_finish: function(data) {
      const prev = jsPsych.data.get()
        .filter({ phase:'practice', stage:1, trial:j+1 })
        .last(1).values()[0] || {};
      data.state2 = prev.state2 || 0;
      updateRewardProbs();
      const choice = data.response === 'f' ? 0 : 1;
      const rp = reward_probs[`state${data.state2}`][choice];
      const reward = Math.random() < rp ? 1 : 0;
      data.choice_stage2 = choice;
      data.reward = reward;
      total_reward += reward;
    }
  });

  // --- フィードバック ---
  timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function() {
      const last = jsPsych.data.get().last(1).values()[0] || {};
      const msg = last.reward ? '💰 報酬を得ました！' : '🙁 報酬はありません';
      return `<div style="font-size:${TEXT_SIZE}"><p>${msg}</p></div>`;
    },
    choices: [' '],
prompt: `<div style="font-size:${TEXT_SIZE}"><p>スペースキーを押して続行</p></div>`
  });

  // --- 記憶テスト前案内 ---
  if (j+1 === insert_memory) {
    timeline.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus:`<div style="font-size:${TEXT_SIZE}"><p>次に記憶テストと賭けを行います。</p>` +
                `<p>直前のステージ1で選択したシンボルを思い出してください。</p></div>`,
      choices: [' '],
prompt: `<div style="font-size:${TEXT_SIZE}"><p>スペースキーを押して続行</p></div>`,
    });
    // 記憶テスト
    timeline.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus:
`<div style="font-size:${TEXT_SIZE}"><p>記憶テスト：直前のステージ1で選択したのは？</p>` +
                `<div style="font-size:${SYMBOL_SIZE};margin:20px 0;">🔴　　🔵</div>` +
                `<p>左: Fキー | 右: Jキー</p></div>`
,
      choices: ['f','j'],
      data: { phase:'practice', stage:'memory', trial:j+1 },
      on_finish: function(data) {
        const actual = jsPsych.data.get()
          .filter({ phase:'practice', stage:1, trial:j+1 })
          .last(1).values()[0]?.choice_stage1;
        const resp = data.response==='f'?0:1;
        data.memory_correct = (actual===resp);
      }
    });
    // 賭け
    timeline.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `
        <div style="font-size:${TEXT_SIZE}">
          <p>先ほどの回答にポイントを賭けますか？</p>
          <p>Y: はい　 N: いいえ</p>
        </div>
      `,
      choices: ['y','n'],
      data: { phase:'practice', stage:'gamble', trial:j+1 },
      on_finish: function(data) {
        const mem = jsPsych.data.get()
          .filter({ phase:'practice', stage:'memory', trial:j+1 })
          .last(1).values()[0] || {};
        const flag = data.response==='y';
        data.gamble_win = flag && mem.memory_correct;
        if (data.gamble_win) total_points++;
      }
    });
    // 復帰説明
    timeline.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `
        <div style="font-size:${TEXT_SIZE}">
          <p>これで記憶賭け試行は終了です。</p>
          <p>通常試行に戻ります。</p>
        </div>
      `,
      choices: [' ']
    });
  }

  // ベースライン
  timeline.push(baseline);
}

// 3. 練習終了メッセージ
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div style="font-size:${TEXT_SIZE}">
      <p>練習終了！本番に移ります。</p>
    </div>
  `,
  choices: ['開始']
});

// 実行
jsPsych.run(timeline);
