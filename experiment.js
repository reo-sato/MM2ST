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
      alert(`✅ データが保存されました\n報酬合計: ${total_reward}\nポイント合計: ${total_points}`);
      jsPsych.data.displayData();
    }).catch(error => {
      alert('❌ 保存に失敗しました: ' + error.message);
      jsPsych.data.displayData();
    });
  }
});

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

const timeline = [];

for (let block = 0; block < num_trials / trials_per_block; block++) {
  const block_timeline = [];
  const insert_index = Math.floor(Math.random() * (trials_per_block - 2)) + 2;

  for (let j = 0; j < trials_per_block; j++) {
    const i = block * trials_per_block + j;
    updateRewardProbs();

    // --- Stage 1 ---
    const stage1 = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: '<p>ステージ1</p>' +
                '<div style="font-size:80px;">🔺　　　🔶</div>' +
                '<p>左: Fキー | 右: Jキー</p>',
      choices: ['f','j'],
      data: { stage: 1, trial: i + 1 },
      on_finish: function(data) {
        data.choice_stage1 = data.response === 'f' ? 0 : 1;
        const common = Math.random() < transition_prob;
        data.state2 = data.choice_stage1 === 0
                      ? (common ? 0 : 1)
                      : (common ? 1 : 0);
        data.transition = common ? 'common' : 'rare';
        console.log(`DEBUG stage1 trial=${data.trial} state2=${data.state2}`);
      }
    };

    // --- Stage 2 ---
    const stage2 = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function() {
        // 直前のステージ1データのみを取得
        const prev = jsPsych.data.get().filter({ stage: 1, trial: i + 1 }).last(1).values()[0];
        const state = prev.state2;
        console.log(`DEBUG stage2 sees state2=${state}`);
        const symbols = [['🔵','🟡'], ['🟢','🟣']];
        return `<p>ステージ2 - 状態 ${state}</p>` +
               `<div style="font-size:80px;">${symbols[state][0]}　　　${symbols[state][1]}</div>` +
               `<p>左: Fキー | 右: Jキー</p>`;
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
        console.log(`DEBUG stage2 trial=${data.trial} choice=${choice} reward=${reward}`);
      }
    };

    // --- Feedback ---
    const feedback = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function() {
        const last = jsPsych.data.get().last(1).values()[0];
        return last.reward
          ? '<p>💰報酬を得ました！</p>'
          : '<p>🙁報酬はありません</p>';
      },
      choices: [' '],
      prompt: '<p>続行するにはスペースキーを押してください。</p>'
    };

    // --- メモリー賭け試行用パーツ ---
    const pre_memory = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: '<p>次に記憶テストと賭けを行います。</p>' +
                '<p>直前のステージ1で選択したシンボルを思い出してください。</p>',
      choices: [' '],
      prompt: '<p>スペースキーを押して続行</p>',
      data: { stage: 'pre_memory' }
    };

    const memory_trial = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: '<p>記憶テスト：直前のステージ1で選択したのは？</p>' +
                '<div style="font-size:80px;">🔺　　　🔶</div>' +
                '<p>左: Fキー | 右: Jキー</p>',
      choices: ['f','j'],
      data: { stage: 'memory' },
      on_finish: function(data) {
        const actual = jsPsych.data.get().filter({ stage: 1, trial: i + 1 }).last(1).values()[0].choice_stage1;
        const resp = data.response === 'f' ? 0 : 1;
        data.memory_response = resp;
        data.memory_correct = (actual === resp);
      }
    };

    const gamble = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: '<p>記憶の正しさにポイントを賭けますか？</p>' +
                '<div style="margin-top:40px;">Y: はい</div>' +
                '<div style="margin-top:20px;">N: いいえ</div>',
      choices: ['y','n'],
      data: { stage: 'gamble' },
      on_finish: function(data) {
        const mem = jsPsych.data.get().filter({ stage: 'memory', trial: i + 1 }).last(1).values()[0];
        const gambleFlag = data.response === 'y';
        const win = gambleFlag && mem.memory_correct;
        data.gambled = gambleFlag;
        data.gamble_win = win;
        if (win) total_points++;
      }
    };

    // ==== タイムラインへの追加 ====
    block_timeline.push(stage1, stage2);

    if (j === insert_index) {
      block_timeline.push(pre_memory, memory_trial, gamble);
    }

    block_timeline.push(feedback);
  }

  timeline.push(...block_timeline);
}

// 被験者ID を全データに追加
jsPsych.data.addProperties({ subject: getSubjectId() });

// 実験開始
jsPsych.run(timeline);
