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
  // 全体イントロ（スペースキーで次へ）
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
  // ステージ1 操作説明と練習（Fキーのみ）
  {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div style="padding:40px 20px; font-size:${TEXT_SIZE}; text-align:center; margin-bottom:40px;">
        <p>ステージ1では、2つのシンボルのうちどちらかを選択します。</p>
        <p>左なら F、右なら J のキーを押してください。</p>
        <p>ここでは試しに F を押してみてください。</p>
      </div>
      <div style="display:flex; justify-content:center; margin-bottom:40px;">
        <span style="font-size:${SYMBOL_SIZE}; margin:0 20px;">🔴</span>
        <span style="font-size:${SYMBOL_SIZE}; margin:0 20px;">🔵</span>
      </div>
      <div style="font-size:${TEXT_SIZE}; text-align:center; margin-bottom:40px;">
        <p>左: Fキー | 右: Jキー</p>
      </div>
    `,
    choices: ['f']
  },
  // ステージ2 操作説明と練習（F or J キー）
  {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div style="padding:40px 20px; font-size:${TEXT_SIZE}; text-align:center; margin-bottom:40px;">
        <p>ステージ2でも、2つのシンボルから一方を選択します。</p>
        <p>それぞれの報酬確率はゆっくり変化するので学習が必要です。</p>
        <p>ここでは試しに F または J を押してみてください。</p>
      </div>
      <div style="display:flex; justify-content:center; margin-bottom:40px;">
        <span style="font-size:${SYMBOL_SIZE}; margin:0 20px;">🟢</span>
        <span style="font-size:${SYMBOL_SIZE}; margin:0 20px;">🟡</span>
      </div>
      <div style="font-size:${TEXT_SIZE}; text-align:center; margin-bottom:40px;">
        <p>左: Fキー | 右: Jキー</p>
      </div>
    `,
    choices: ['f','j']
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
    stimulus: `
      <div style="padding:40px 20px; font-size:${TEXT_SIZE}; text-align:center; margin-bottom:40px;">
        <p>もう一度 F を押してみてください。</p>
      </div>
      <div style="display:flex; justify-content:center; margin-bottom:40px;">
        <span style="font-size:${SYMBOL_SIZE}; margin:0 20px;">🔴</span>
        <span style="font-size:${SYMBOL_SIZE}; margin:0 20px;">🔵</span>
      </div>
      <div style="font-size:${TEXT_SIZE}; text-align:center; margin-bottom:40px;">
        <p>左: Fキー | 右: Jキー</p>
      </div>
    `,
    choices: ['f']
  },
  // 遷移構造説明＋練習
  {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div style="padding:40px 20px; font-size:${TEXT_SIZE}; text-align:center; margin-bottom:40px;">
        <p>実は、ステージ2ではステージ1の選択に応じて2対のシンボルが提示されます。</p>
        <p>確率的に決まりますが、選択によって提示されやすさが変わります。</p>
        <p>ここでは F または J を押してみてください。</p>
      </div>
      <div style="display:flex; justify-content:center; margin-bottom:40px;">
        <span style="font-size:${SYMBOL_SIZE}; margin:0 20px;">🟣</span>
        <span style="font-size:${SYMBOL_SIZE}; margin:0 20px;">🟠</span>
      </div>
      <div style="font-size:${TEXT_SIZE}; text-align:center; margin-bottom:40px;">
        <p>左: Fキー | 右: Jキー</p>
      </div>
    `,
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

// 2. 練習試行パラメータ（既存コードを省略せず適用）
const practice_trials = 6;
const insert_memory = 3;
for (let j = 0; j < practice_trials; j++) {
  // --- ステージ1 ---
  timeline.push({ /* stage1試行ここ */ });
  // --- ステージ2 ---
  timeline.push({ /* stage2試行ここ */ });
  // --- フィードバック ---
  timeline.push({ /* feedback試行ここ */ });
  // --- 記憶賭けパート ---
  if (j+1 === insert_memory) {
    timeline.push({ /* pre-memoryここ */ });
    timeline.push({ /* memoryここ */ });
    timeline.push({ /* gambleここ */ });
    timeline.push({ /* post-memoryここ */ });
  }
  // --- ベースライン ---
  timeline.push(baseline);
}

// 3. 練習終了メッセージ
timeline.push({
  type: jsPsychHtmlButtonResponse,
  stimulus: `<div style="padding:40px 20px; font-size:${TEXT_SIZE}; text-align:center;"><p>練習終了！本番に移ります。</p></div>`,
  choices: ['開始']
});

// 実行
jsPsych.run(timeline);
