// JavaScript source code
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
  return (
    mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  );
}

function getSubjectId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("subject") || "unknown";
}

const timeline = [];

for (let block = 0; block < num_trials / trials_per_block; block++) {
  const blockTimeline = [];
  const insertIndex = Math.floor(Math.random() * (trials_per_block - 2)) + 2;

  for (let j = 0; j < trials_per_block; j++) {
    const globalIndex = block * trials_per_block + j;
    updateRewardProbs();

    // Stage 1
    const stage1 = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus:
        '<p>ステージ1</p>' +
        '<div style="font-size:80px;">🔺　　　🔶</div>' +
        '<p>左: Fキー | 右: Jキー</p>',
      choices: ['f', 'j'],
      data: { stage: 1, trial: globalIndex + 1 },
      on_finish: function (data) {
        data.choice_stage1 = data.response === 'f' ? 0 : 1;
        const common = Math.random() < transition_prob;
        data.state2 = data.choice_stage1 === 0 ? (common ? 0 : 1) : (common ? 1 : 0);
        data.transition = common ? 'common' : 'rare';
      }
    };

    // Stage 2
    const stage2 = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function () {
        // Use last trial (stage1) data
        const last = jsPsych.data.get().last(1).values()[0];
        const state = last?.state2 ?? 0;
        const symbols = [['🔵', '🟡'], ['🟢', '🟣']];
        return (
          `<p>ステージ2 - 状態 ${state}</p>` +
          `<div style="font-size:80px;">${symbols[state][0]}　　　${symbols[state][1]}</div>` +
          '<p>左: Fキー | 右: Jキー</p>'
        );
      },
      choices: ['f', 'j'],
      data: { stage: 2, trial: globalIndex + 1 },
      on_finish: function (data) {
        const last = jsPsych.data.get().last(1).values()[0];
        const state = last?.state2 ?? 0;
        const choice = data.response === 'f' ? 0 : 1;
        const rewardProb = reward_probs[`state${state}`][choice];
        data.reward = Math.random() < rewardProb ? 1 : 0;
        total_reward += data.reward;
        data.state2 = state;
        data.choice_stage2 = choice;
      }
    };

    // Feedback
    const feedback = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function () {
        const last = jsPsych.data.get().last(1).values()[0];
        const rew = last?.reward ?? 0;
        return rew
          ? '<p>💰報酬を得ました！</p>'
          : '<p>🙁報酬はありません</p>';
      },
      choices: ['f', 'j']
    };

    // Push trials
    blockTimeline.push(stage1, stage2, feedback);

    // Memory + Gamble
    if (j === insertIndex) {
      const memoryTrial = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus:
          '<p>記憶テスト：直前のステージ1で選択したのは？</p>' +
          '<div style="font-size:80px;">🔺　　　🔶</div>' +
          '<p>左: Fキー | 右: Jキー</p>',
        choices: ['f', 'j'],
        data: { stage: 'memory' },
        on_finish: function (data) {
          const last = jsPsych.data.get().filter({ stage: 1 }).last(1).values()[0];
          const resp = data.response === 'f' ? 0 : 1;
          data.memory_response = resp;
          data.memory_correct = last?.choice_stage1 === resp;
        }
      };

      const gamble = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus:
          '<p>記憶の正しさにポイントを賭けますか？</p>' +
          '<div style="margin-top:30px;">はい: Yキー</div>' +
          '<div style="margin-top:20px;">いいえ: Nキー</div>',
        choices: ['y', 'n'],
        data: { stage: 'gamble' },
        on_finish: function (data) {
          const mem = jsPsych.data.get().filter({ stage: 'memory' }).last(1).values()[0];
          const gamble = data.response === 'y';
          const won = gamble && mem?.memory_correct;
          data.gambled = gamble;
          data.gamble_win = won;
          if (won) total_points += 1;
        }
      };

      blockTimeline.push(memoryTrial, gamble);
    }
  }

  timeline.push(...blockTimeline);
}

// Add subject ID
jsPsych.data.addProperties({ subject: getSubjectId() });

// Firebase save
firebase.auth().signInAnonymously().then(() => {
  const subjectId = getSubjectId();
  const js = initJsPsych({
    on_finish: function () {
      const d = jsPsych.data.get().json();
      firebase.database().ref('data/' + subjectId).set({
        timestamp: Date.now(),
        total_reward: total_reward,
        total_points: total_points,
        data: JSON.parse(d)
      }).then(() => {
        alert(`✅ 保存完了\n報酬: ${total_reward}\nポイント: ${total_points}`);
      }).catch(err => {
        alert(`❌ 保存失敗: ${err.message}`);
      });
    }
  });
  js.data.addProperties({ subject: subjectId });
  js.run(timeline);
});
