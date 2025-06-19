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

// 1. インストラクション（説明文を変更せず、レイアウトを再現）
const instructions = [
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div style="font-size:${TEXT_SIZE}"><p>ようこそ！このタスクは、一試行当たり2段階の選択と、時折記憶テストがあります。</p></div>`,
    choices: ['次へ']
  },
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div style="font-size:${TEXT_SIZE}"><p>ステージ1では、2つのシンボルのうちどちらかを選択します。</p>` +
              `<div style="font-size:${SYMBOL_SIZE};margin:20px 0;">🔺　　🔶</div></div>`,
    choices: ['次へ']
  },
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div style="font-size:${TEXT_SIZE}"><p>ステージ2では、2対のシンボルのうち1対が提示されます。どのシンボルの組が提示されるかは確率的に決まりますが、ステージ１の選択によって、どのシンボルの組がを提示されやすいかが決まります。</p>` +
              `<div style="font-size:${SYMBOL_SIZE};margin:20px 0;">🔵　　🟡</div></div>`,
    choices: ['次へ']
  },
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div style="font-size:${TEXT_SIZE}"><p>ステージ2では、2つのシンボルから一方を選択します。それぞれのシンボルに対して報酬の1ポイントがどのような確率で得られるかは決まっており、この確率はゆっくりと変化していくため、今現在どのシンボルを選択することが報酬獲得につながりやすいのかを学習していく必要があります。</p>` +
              `<div style="font-size:${SYMBOL_SIZE};margin:20px 0;">🟢　　🟣</div></div>`,
    choices: ['次へ']
  },
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div style="font-size:${TEXT_SIZE}"><p>また、時折挟まる記憶テストでは、直近のステージ1でどのシンボルを選択したか思い出してもらいます。さらに、その回答に対して通常試行と共通のポイントを賭けることができます。賭けた場合には、正解→+1ポイント　不正解→-1ポイントとなり、賭けなかった場合には正解→0ポイント　不正解→0ポイントとなります。</p></div>`,
    choices: ['次へ']
  },
  {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div style="font-size:${TEXT_SIZE}"><p>それでは、練習を始めます！練習中の報酬は本報酬に影響しません。</p></div>`,
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
    stimulus: `<div style="font-size:${TEXT_SIZE}"><p>ステージ1</p>` +
              `<div style="font-size:${SYMBOL_SIZE};margin:20px 0;">🔺　　🔶</div>` +
              `<p>左: Fキー | 右: Jキー</p></div>`,
    choices: ['f', 'j'],
    data: { phase: 'practice', stage: 1, trial: j+1 },
    on_finish: data => {
      data.choice_stage1 = data.response === 'f' ? 0 : 1;
      data.state2 = data.choice_stage1;
    }
  });

  // --- ステージ2 ---
  timeline.push({
    type: jsPsychHtmlKeyboardResponse,
    stimulus: function() {
      const prev = jsPsych.data.get().filter({ phase:'practice', stage:1, trial:j+1 }).last(1).values()[0] || {};
      const state = prev.state2 ?? 0;
      const symbols = [['🔵','🟡'],['🟢','🟣']];
      return `<div style="font-size:${TEXT_SIZE}"><p>ステージ2 - 状態 ${state}</p>` +
             `<div style="font-size:${SYMBOL_SIZE};margin:20px 0;">${symbols[state][0]}　　${symbols[state][1]}</div>` +
             `<p>左: Fキー | 右: Jキー</p></div>`;
    },
    choices: ['f', 'j'],
    data: { phase: 'practice', stage: 2, trial: j+1 },
    on_finish: data => {
      updateRewardProbs();
      const choice = data.response==='f'?0:1;
      const rp = reward_probs[`state${data.state2}`][choice];
      data.choice_stage2 = choice;
      data.reward = Math.random()<rp?1:0;
      total_reward += data.reward;
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
    choices: [' ']
  });

  // --- 記憶賭け挿入 ---
  if (j+1 === insert_memory) {
    // 記憶テスト
    timeline.push({ type: jsPsychHtmlKeyboardResponse,
      stimulus: `<div style="font-size:${TEXT_SIZE}"><p>記憶テスト：直前のステージ1で選択したのは？</p>` +
                `<div style="font-size:${SYMBOL_SIZE};margin:20px 0;">🔺　　🔶</div>` +
                `<p>左: Fキー | 右: Jキー</p></div>`, choices:['f','j'],
      data:{phase:'practice',stage:'memory',trial:j+1},
      on_finish:data=>{
        const actual = jsPsych.data.get().filter({phase:'practice',stage:1,trial:j+1}).last(1).values()[0]?.choice_stage1;
        data.memory_correct = actual === (data.response==='f'?0:1);
      }
    });
    // 賭け
    timeline.push({ type: jsPsychHtmlKeyboardResponse,
      stimulus: `<div style="font-size:${TEXT_SIZE}"><p>記憶の正しさにポイントを賭けますか？</p>` +
               `<p style="margin-top:20px; font-size:${TEXT_SIZE}">Y: はい | N: いいえ</p></div>`, choices:['y','n'],
      data:{phase:'practice',stage:'gamble',trial:j+1},
      on_finish:data=>{
        const mem=jsPsych.data.get().filter({phase:'practice',stage:'memory',trial:j+1}).last(1).values()[0]||{};
        const gambleFlag=data.response==='y'; data.gamble_win=gambleFlag&&mem.memory_correct; if(data.gamble_win) total_points++;
      }
    });
    // 通常試行復帰
    timeline.push({ type: jsPsychHtmlKeyboardResponse, stimulus: `<div style="font-size:${TEXT_SIZE}"><p>通常試行に戻ります。</p></div>`, choices:[' '] });
  }
}

// 3. 練習終了メッセージ
timeline.push({ type: jsPsychHtmlButtonResponse, stimulus: `<div style="font-size:${TEXT_SIZE}"><p>練習終了！本番に移ります。</p></div>`, choices: ['開始'] });

// 実行
jsPsych.run(timeline);
