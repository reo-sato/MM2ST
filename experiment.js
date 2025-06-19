// experiment.js

let total_reward = 0;
let total_points = 0;

// jsPsych 初期化（on_finish で Firebase に保存）
const jsPsych = initJsPsych({
  on_finish: function () {
    const subjectId = getSubjectId();
    const jsonData = jsPsych.data.get().json();
    firebase.database().ref('data/' + subjectId).set({
      timestamp: Date.now(),
      total_reward: total_reward,
      total_points: total_points,
      data: JSON.parse(jsonData)
    }).then(() => {
      alert(`✅ データが保存されました
報酬合計: ${total_reward}
ポイント合計: ${total_points}`);
      jsPsych.data.displayData();
    }).catch(error => {
      alert('❌ 保存に失敗しました: ' + error.message);
      jsPsych.data.displayData();
    });
  }
});

// 表示サイズ設定
const TEXT_SIZE = '24px';
const SYMBOL_SIZE = '120px';

const num_trials = 200;
const trials_per_block = 5;
const transition_prob = 0.7;
const step_size = 0.025;
const reward_bounds = [0.25, 0.75];

let reward_probs = {
  state0: [0.5, 0.5],
  state1: [0.5, 0.5]
};

function updateRewardProbs() {
  ['state0','state1'].forEach(state => {
    reward_probs[state] = reward_probs[state].map(p => {
      const new_p = Math.min(
        Math.max(p + normalRandom(0, step_size), reward_bounds[0]),
        reward_bounds[1]
      );
      return new_p;
    });
  });
}

function normalRandom(mean = 0, std = 1) {
  let u = Math.random(), v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function getSubjectId() {
  return new URLSearchParams(window.location.search).get('subject') || 'unknown';
}

// ベースライン（注視ターゲット）定義
const baseline = {
  type: jsPsychHtmlKeyboardResponse,
  stimulus: '<div style="font-size:48px; text-align:center;">+</div>',
  choices: [],
  trial_duration: 1000
};

const timeline = [];

for (let block = 0; block < num_trials / trials_per_block; block++) {
  const block_timeline = [];
  const insert_index = Math.floor(Math.random() * (trials_per_block - 2)) + 2;

  for (let j = 0; j < trials_per_block; j++) {
    const i = block * trials_per_block + j;
    updateRewardProbs();

    // Stage1
    const stage1 = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `<div style="font-size:${TEXT_SIZE}"><p>ステージ1</p>` +
                `<div style="font-size:${SYMBOL_SIZE};margin:20px 0;">🔺　　🔶</div>` +
                `<p>左: Fキー | 右: Jキー</p></div>`,
      choices: ['f','j'],
      data: { stage: 1, trial: i + 1 },
      on_finish: function(data) {
        data.choice_stage1 = data.response === 'f' ? 0 : 1;
        const common = Math.random() < transition_prob;
        data.state2 = data.choice_stage1 === 0
                      ? (common ? 0 : 1)
                      : (common ? 1 : 0);
        data.transition = common ? 'common' : 'rare';
      }
    };

    // Stage2
    const stage2 = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function() {
        const prev = jsPsych.data.get().filter({ stage: 1, trial: i + 1 }).last(1).values()[0];
        const state = prev.state2;
        const symbols = [['🔵','🟡'], ['🟢','🟣']];
        return `<div style="font-size:${TEXT_SIZE}"><p>ステージ2 - 状態 ${state}</p>` +
               `<div style="font-size:${SYMBOL_SIZE};margin:20px 0;">${symbols[state][0]}　　${symbols[state][1]}</div>` +
               `<p>左: Fキー | 右: Jキー</p></div>`;
      },
      choices: ['f','j'],
      data: { stage: 2, trial: i + 1 },
      on_finish: function(data) {
        const prev = jsPsych.data.get().filter({ stage: 1, trial: i + 1 }).last(1).values()[0];
        const state = prev.state2;
        const choice = data.response === 'f' ? 0 : 1;
        const rp = reward_probs[`state${state}`][choice];
        const reward = Math.random() < rp ? 1 : 0;
        data.state2 = state;
        data.choice_stage2 = choice;
        data.reward = reward;
        total_reward += reward;
      }
    };

    // Feedback
    const feedback = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function() {
        const last = jsPsych.data.get().last(1).values()[0];
        const msg = last.reward ? '💰報酬を得ました！' : '🙁報酬はありません';
        return `<div style="font-size:${TEXT_SIZE}"><p>${msg}</p></div>`;
      },
      choices: [' '],
      prompt: `<div style="font-size:${TEXT_SIZE}"><p>スペースキーを押して続行</p></div>`
    };

    // 記憶賭け前案内
    const pre_memory = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `<div style="font-size:${TEXT_SIZE}"><p>次に記憶テストと賭けを行います。</p>` +
                `<p>直前のステージ1で選択したシンボルを思い出してください。</p></div>`,
      choices: [' '],
      prompt: `<div style="font-size:${TEXT_SIZE}"><p>スペースキーを押して続行</p></div>`,
      data: { stage: 'pre_memory', trial: i + 1 }
    };

    // Memory trial + gamble
    const memory_trial = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `<div style="font-size:${TEXT_SIZE}"><p>記憶テスト：直前のステージ1で選択したのは？</p>` +
                `<div style="font-size:${SYMBOL_SIZE};margin:20px 0;">🔺　　🔶</div>` +
                `<p>左: Fキー | 右: Jキー</p></div>`,
      choices: ['f','j'],
      data: { stage: 'memory', trial: i + 1 },
      on_finish: function(data) {
        const actual = jsPsych.data.get().filter({ stage: 1, trial: i + 1 }).last(1).values()[0].choice_stage1;
        const resp = data.response === 'f' ? 0 : 1;
        data.memory_response = resp;
        data.memory_correct = (actual === resp);
      }
    };
    const gamble = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `<div style="font-size:${TEXT_SIZE}"><p>先ほどの回答にポイントを賭けますか？</p>` +
                `<div style="margin:20px 0; font-size:${TEXT_SIZE}">Y: はい　 N: いいえ</div></div>`,
      choices: ['y','n'],
      data: { stage: 'gamble', trial: i + 1 },
      on_finish: function(data) {
        const mem = jsPsych.data.get().filter({ stage: 'memory' }).last(1).values()[0] || {};
        const gambleFlag = data.response === 'y';
        data.gambled = gambleFlag;
        data.gamble_win = gambleFlag && mem.memory_correct;
        if (data.gamble_win) total_points++;
      }
    };
    const post_memory = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `<div style="font-size:${TEXT_SIZE}"><p>これで記憶賭け試行は終了です。</p>` +
                `<p>通常試行に戻ります。</p></div>`,
      choices: [' '],
      prompt: `<div style="font-size:${TEXT_SIZE}"><p>スペースキーを押して続行してください。</p></div>`,
      data: { stage: 'post_memory', trial: i + 1 }
    };

    // Build timeline for this trial
    if (j === insert_index) {
      block_timeline.push(stage1, stage2, feedback, pre_memory, memory_trial, gamble, post_memory);
    } else {
      block_timeline.push(stage1, stage2, feedback);
    }

    // ここでベースライン画面を追加
    block_timeline.push(baseline);
  }

  timeline.push(...block_timeline);
}

// 被験者ID を全データに追加
jsPsych.data.addProperties({ subject: getSubjectId() });

// 実験開始
jsPsych.run(timeline);
