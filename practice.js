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
  { type: jsPsychHtmlButtonResponse, stimulus: `<div style="font-size:${TEXT_SIZE}; text-align:center;"><p>ようこそ！このタスクは、一試行当たり2段階の選択と、時折記憶テストがあります。</p><p>まずは課題構造を練習しましょう。</p></div>`, choices: ['次へ'] },
  { type: jsPsychHtmlButtonResponse, stimulus: `<div style="font-size:${TEXT_SIZE}"><p>ステージ1: ■ または ◆ のどちらかを選択します。</p></div>`, choices: ['次へ'] },
  { type: jsPsychHtmlButtonResponse, stimulus: `<div style="font-size:${TEXT_SIZE}"><p>ステージ2: ステージ1の選択をもとに2つのシンボルが提示され、再度選択します。</p></div>`, choices: ['次へ'] },
  { type: jsPsychHtmlButtonResponse, stimulus: `<div style="font-size:${TEXT_SIZE}"><p>報酬: 選択したシンボルに応じて報酬が得られます（確率はゆっくり変化）。</p></div>`, choices: ['次へ'] },
  { type: jsPsychHtmlButtonResponse, stimulus: `<div style="font-size:${TEXT_SIZE}"><p>記憶テスト: 時折ステージ1で選択したシンボルを思い出し、ポイントを賭けます。</p></div>`, choices: ['次へ'] },
  { type: jsPsychHtmlButtonResponse, stimulus: `<div style="font-size:${TEXT_SIZE}; text-align:center;"><p>それでは練習を始めます。</p><p>練習中の結果は本試験に影響しません。</p></div>`, choices: ['開始'] }
];
timeline.push(...instructions);

// 2. 練習試行パラメータ
const practice_trials = 6;
const insert_memory = 3;

for (let j = 0; j < practice_trials; j++) {
  // ステージ1
  timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `<div style="font-size:${TEXT_SIZE}"><p>ステージ1</p><div style="font-size:${SYMBOL_SIZE};margin:20px 0;">■　　◆</div><p>左: Fキー | 右: Jキー</p></div>`,
    choices: ['f','j'],
    data: { phase: 'practice', stage: 1, trial: j+1 },
    on_finish: function(data) {
      data.choice_stage1 = data.response === 'f' ? 0 : 1;
      data.state2 = data.choice_stage1;
    }
  });

  // ステージ2
  timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function() {
      const prev = jsPsych.data.get().filter({ phase:'practice', stage:1, trial:j+1 }).last(1).values()[0] || {};
      const state = prev.state2 || 0;
      const symbols = [['■','◆'], ['◆','■']];
      return `<div style="font-size:${TEXT_SIZE}"><p>ステージ2 - 状態 ${state}</p><div style="font-size:${SYMBOL_SIZE};margin:20px 0;">${symbols[state][0]}　　${symbols[state][1]}</div><p>左: Fキー | 右: Jキー</p></div>`;
    },
    choices: ['f','j'],
    data: { phase: 'practice', stage: 2, trial: j+1 },
    on_finish: function(data) {
      const prev = jsPsych.data.get().filter({ phase:'practice', stage:1, trial:j+1 }).last(1).values()[0] || {};
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

  // フィードバック
  timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function() {
      const last = jsPsych.data.get().last(1).values()[0] || {};
      const msg = last.reward ? '💰 報酬を得ました！' : '🙁 報酬はありません';
      return `<div style="font-size:${TEXT_SIZE}"><p>${msg}</p></div>`;
    },
    choices: [' ']
  });

  // 記憶課題パート
  if (j+1 === insert_memory) {
    // 前案内
    timeline.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `<div style="font-size:${TEXT_SIZE}"><p>次に記憶テストと賭けを行います。</p><p>直前のステージ1で選択したシンボルを思い出してください。</p></div>`,
      choices: [' ']
    });
    // 記憶テスト
    timeline.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `<div style="font-size:${TEXT_SIZE}"><p>記憶テスト：直前のステージ1で選択したのは？</p><div style="font-size:${SYMBOL_SIZE};margin:20px 0;">■　　◆</div><p>左: Fキー | 右: Jキー</p></div>`,
      choices: ['f','j'],
      data: { phase:'practice', stage:'memory', trial:j+1 },
      on_finish: function(data) {
        const actual = jsPsych.data.get().filter({ phase:'practice', stage:1, trial:j+1 }).last(1).values()[0]?.choice_stage1;
        const resp = data.response === 'f' ? 0 : 1;
        data.memory_correct = (actual === resp);
      }
    });
    // 賭け
    timeline.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `<div style="font-size:${TEXT_SIZE}"><p>記憶の正しさにポイントを賭けますか？</p><p>Y: はい　 N: いいえ</p></div>`,
      choices: ['y','n'],
      data: { phase:'practice', stage:'gamble', trial:j+1 },
      on_finish: function(data) {
        const mem = jsPsych.data.get().filter({ phase:'practice', stage:'memory', trial:j+1 }).last(1).values()[0] || {};
        const flag = data.response === 'y';
        data.gamble_win = flag && mem.memory_correct;
        if (data.gamble_win) total_points++;
      }
    });
    // 復帰案内
    timeline.push({
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `<div style="font-size:${TEXT_SIZE}"><p>これで記憶賭け試行は終了です。</p><p>通常試行に戻ります。</p></div>`,
      choices: [' ']
    });
  }

  // ベースライン
  timeline.push(baseline);
}

// 練習終了メッセージ
timeline.push({ type: jsPsychHtmlButtonResponse, stimulus: `<div style="font-size:${TEXT_SIZE}"><p>練習終了！本番に移ります。</p></div>`, choices: ['開始'] });

jsPsych.run(timeline);
