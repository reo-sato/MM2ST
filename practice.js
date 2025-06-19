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
def normalRandom(mean = 0, std = 1) {
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

// 1. インストラクション（説明文はそのまま、レイアウト強化）
const instructions = [
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="font-size:${TEXT_SIZE}; text-align:center;">
        <p>ようこそ！このタスクは、一試行当たり2段階の選択と、時折記憶テストがあります。</p>
        <div style="margin-top:20px; display:flex; justify-content:center; align-items:center;">
          <span>ステージ1</span>
          <span style="margin:0 10px; font-size:32px;">➔</span>
          <span>ステージ2</span>
          <span style="margin:0 10px; font-size:32px;">➔</span>
          <span>報酬表示</span>
        </div>
      </div>
    `,
    choices: ['次へ']
  },
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="font-size:${TEXT_SIZE}; text-align:center;">
        <p>ステージ1では、2つのシンボルのうちどちらかを選択します。</p>
        <div style="font-size:${SYMBOL_SIZE}; margin:20px 0; display:flex; justify-content:center;">
          <div style="margin:0 40px;">🔺</div><div style="margin:0 40px;">🔶</div>
        </div>
      </div>
    `,
    choices: ['次へ']
  },
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="font-size:${TEXT_SIZE}; text-align:left;">
        <p>ステージ2では、2対のシンボルのうち1対が提示されます。どのシンボルの組が提示されるかは確率的に決まりますが、</p>
        <p>ステージ1の選択によって、提示されやすさが変わります。</p>
        <div style="font-size:${SYMBOL_SIZE}; margin:20px auto; display:flex; justify-content:center;">
          <div style="text-align:center; margin:0 30px;"><p>🔺選択時</p><p>🔵　🟡</p></div>
          <div style="text-align:center; margin:0 30px;"><p>🔶選択時</p><p>🟢　🟣</p></div>
        </div>
      </div>
    `,
    choices: ['次へ']
  },
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="font-size:${TEXT_SIZE}; text-align:center;">
        <p>ステージ2では、2つのシンボルから一方を選択します。</p>
        <p>それぞれのシンボルに対して報酬が得られる確率はゆっくり変化します。</p>
        <div style="margin-top:20px;">
          <div style="display:flex; justify-content:center; align-items:flex-end; height:80px;">
            <div style="width:50px; height:${50 + reward_probs.state0[0] * 50}px; background:lightgray; margin:0 20px; display:flex; justify-content:center; align-items:center;">🔵</div>
            <div style="width:50px; height:${50 + reward_probs.state0[1] * 50}px; background:lightgray; margin:0 20px; display:flex; justify-content:center; align-items:center;">🟡</div>
          </div>
          <p style="text-align:center;">例: 🔵(70%) 🟡(30%) のように確率を学習します。</p>
        </div>
      </div>
    `,
    choices: ['次へ']
  },
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div style="font-size:${TEXT_SIZE}; text-align:left;">
        <p>また、時折挟まる記憶テストでは、直近のステージ1でどのシンボルを選択したか思い出してもらいます。</p>
        <p>さらに、その回答に対して通常試行と共通のポイントを賭けることができます。</p>
        <ul style="margin-top:10px;">
          <li>賭けた場合：正解→+1ポイント、不正解→-1ポイント</li>
          <li>賭けなかった場合：正解・不正解ともに0ポイント</li>
        </ul>
      </div>
    `,
    choices: ['次へ']
  },
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div style="font-size:${TEXT_SIZE}; text-align:center;"><p>それでは、練習を始めます！練習中の報酬は本報酬に影響しません。</p></div>`,
    choices: ['開始']
  }
];
timeline.push(...instructions);

// 2. 以下、実際の課題部分（変更なし）
// （省略）
jsPsych.run(timeline);
