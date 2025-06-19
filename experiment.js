// JavaScript source code with debug logging
let total_reward = 0;
let total_points = 0;

const jsPsych = initJsPsych({
  on_finish: function () {
    jsPsych.data.displayData();
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
  ['state0', 'state1'].forEach(state => {
    reward_probs[state] = reward_probs[state].map(p => {
      const new_p = Math.min(Math.max(p + normalRandom(0, step_size), reward_bounds[0]), reward_bounds[1]);
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
  const block_tl = [];
  const insert_index = Math.floor(Math.random() * (trials_per_block - 2)) + 2;

  for (let j = 0; j < trials_per_block; j++) {
    const trialNum = block * trials_per_block + j + 1;
    updateRewardProbs();

    const stage1 = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: '<p>ステージ1</p><div style="font-size:80px;">🔺　　　🔶</div><p>左: Fキー | 右: Jキー</p>',
      choices: ['f', 'j'],
      data: { stage: 1, trial: trialNum },
      on_finish: function(data) {
        data.choice_stage1 = data.response === 'f' ? 0 : 1;
        const common = Math.random() < transition_prob;
        const state2 = data.choice_stage1 === 0 ? (common ? 0 : 1) : (common ? 1 : 0);
        data.state2 = state2;
        data.transition = common ? 'common' : 'rare';
        console.log(`Stage1 trial ${data.trial}: choice_stage1=${data.choice_stage1}, common=${common}, state2=${state2}`);
      }
    };

    const stage2 = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function() {
        const last1 = jsPsych.data.get().filter({ stage: 1 }).last(1).values()[0];
        const state = last1?.state2 ?? 0;
        console.log(`Stage2 trial ${trialNum}: sees state2=${state}`);
        const symbols = [['🔵','🟡'],['🟢','🟣']];
        return `<p>ステージ2 - 状態 ${state}</p><div style="font-size:80px;">${symbols[state][0]}　　　${symbols[state][1]}</div><p>左: Fキー | 右: Jキー</p>`;
      },
      choices: ['f', 'j'],
      data: { stage: 2, trial: trialNum },
      on_finish: function(data) {
        const last1 = jsPsych.data.get().filter({ stage: 1 }).last(1).values()[0];
        const state = last1?.state2 ?? 0;
        const choice = data.response === 'f' ? 0 : 1;
        const rp = reward_probs[`state${state}`][choice];
        const reward = Math.random() < rp ? 1 : 0;
        data.choice_stage2 = choice;
        data.state2 = state;
        data.reward = reward;
        total_reward += reward;
        console.log(`Stage2 trial ${data.trial}: choice=${choice}, reward=${reward}`);
      }
    };

    const feedback = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function() {
        const reward = jsPsych.data.get().last(1).values()[0]?.reward ?? 0;
        return reward ? '<p>💰報酬を得ました！</p>' : '<p>🙁報酬はありません</p>';
      },
      choices: ['f', 'j']
    };

    block_tl.push(stage1, stage2, feedback);

    if (j === insert_index) {
      const memory = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: '<p>記憶テスト：直前のステージ1で選択したのは？</p><div style="font-size:80px;">🔺　　　🔶</div><p>左: Fキー | 右: Jキー</p>',
        choices: ['f', 'j'],
        data: { stage: 'memory' },
        on_finish: function(data) {
          const actual = jsPsych.data.get().filter({ stage: 1 }).last(1).values()[0]?.choice_stage1;
          const resp = data.response === 'f' ? 0 : 1;
          data.memory_response = resp;
          data.memory_correct = actual === resp;
          console.log(`Memory trial: actual=${actual}, response=${resp}, correct=${data.memory_correct}`);
        }
      };
      const gamble = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: '<p>記憶の正しさにポイントを賭けますか？</p><div style="margin-top:40px;">はい: Yキー</div><div style="margin-top:20px;">いいえ: Nキー</div>',
        choices: ['y', 'n'],
        data: { stage: 'gamble' },
        on_finish: function(data) {
          const mem = jsPsych.data.get().filter({ stage: 'memory' }).last(1).values()[0];
          const gamble = data.response === 'y';
          const win = gamble && mem?.memory_correct;
          data.gambled = gamble;
          data.gamble_win = win;
          if (win) total_points++;
          console.log(`Gamble trial: gamble=${gamble}, mem.correct=${mem?.memory_correct}, win=${win}`);
        }
      };
      block_tl.push(memory, gamble);
    }
  }
  timeline.push(...block_tl);
}

jsPsych.data.addProperties({ subject: getSubjectId() });

firebase.auth().signInAnonymously().then(() => {
  const subjectId = getSubjectId();
  const saver = initJsPsych({
    on_finish: function() {
      const d = jsPsych.data.get().json();
      firebase.database().ref('data/' + subjectId).set({
        timestamp: Date.now(),
        total_reward,
        total_points,
        data: JSON.parse(d)
      }).then(() => console.log('Data saved')).catch(e => console.error(e));
    }
  });
  saver.data.addProperties({ subject: subjectId });
  saver.run(timeline);
});
