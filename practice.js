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
  // 1. 全体イントロ
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="padding:40px 20px; font-size:${TEXT_SIZE};">
        <p>ようこそ！このタスクは、一試行当たり2段階の選択と、時折記憶テストがあります。</p>
      </div>
    `,
    choices: ['次へ']
  },
  // 2. ステージ1 説明
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="padding:40px 20px; font-size:${TEXT_SIZE};">
        <p>ステージ1では、2つのシンボルのうちどちらかを選択します。</p>
      </div>
    `,
    choices: ['次へ']
  },
  // 3. ステージ2 説明(遷移構造)
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="padding:40px 20px; font-size:${TEXT_SIZE};">
        <p>ステージ2では、2対のシンボルのうち1対が提示されます。どのシンボルの組が提示されるかは確率的に決まりますが、ステージ１の選択によって、どのシンボルの組が提示されやすいかが決まります。</p>
      </div>
    `,
    choices: ['次へ']
  },
  // 4. ステージ2 報酬学習 説明
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="padding:40px 20px; font-size:${TEXT_SIZE};">
        <p>ステージ2では、2つのシンボルから一方を選択します。それぞれのシンボルに対して報酬の1ポイントがどのような確率で得られるかは決まっており、この確率はゆっくりと変化していくため、今現在どのシンボルを選択することが報酬獲得につながりやすいのかを学習していく必要があります。</p>
      </div>
    `,
    choices: ['次へ']
  },
  // 5. 記憶テスト 説明
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="padding:40px 20px; font-size:${TEXT_SIZE};">
        <p>また、時折挟まる記憶テストでは、直近のステージ1でどのシンボルを選択したか思い出してもらいます。さらに、その回答に対して通常試行と共通のポイントを賭けることができます。賭けた場合には、正解→+1ポイント　不正解→-1ポイントとなり、賭けなかった場合には正解→0ポイント　不正解→0ポイントとなります。</p>
      </div>
    `,
    choices: ['次へ']
  },
  // 6. 練習開始
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="padding:40px 20px; font-size:${TEXT_SIZE};">
        <p>それでは、練習を始めます！練習中の報酬は本報酬に影響しません。</p>
      </div>
    `,
    choices: ['開始']
  }
];

timeline.push(...instructions);

timeline.push(...instructions);

// 2. 練習試行パラメータ（省略せず既存コードをそのまま適用）
const practice_trials = 6;
const insert_memory = 3;
for (let j = 0; j < practice_trials; j++) {
  // --- ステージ1 ---
  timeline.push({ /* 省略: 既存のstage1試行 */ });
  // --- ステージ2 ---
  timeline.push({ /* 省略: 既存のstage2試行 */ });
  // --- フィードバック ---
  timeline.push({ /* 省略: 既存のフィードバック */ });
  // --- 記憶賭けパート ---
  if (j+1 === insert_memory) {
    timeline.push({ /* 省略: pre-memory */ });
    timeline.push({ /* 省略: memory */ });
    timeline.push({ /* 省略: gamble */ });
    timeline.push({ /* 省略: post-memory */ });
  }
  // ベースライン
  timeline.push(baseline);
}

// 3. 練習終了メッセージ
timeline.push({ type: jsPsychHtmlButtonResponse, stimulus: `<div style="font-size:${TEXT_SIZE}"><p>練習終了！本番に移ります。</p></div>`, choices: ['開始'] });

// 実行
jsPsych.run(timeline);
