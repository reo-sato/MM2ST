// experiment.js
const jsPsych = initJsPsych({
  on_finish: function () {
    jsPsych.data.displayData();
  }
});

const total_trials = 200;
const block_size = 5;
const num_blocks = total_trials / block_size;
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
  const params = new URLSearchParams(window.location.search);
  return params.get("subject") || "unknown";
}

const timeline = [];

let trial_counter = 1;
for (let block = 0; block < num_blocks; block++) {
  for (let i = 0; i < block_size; i++) {
    updateRewardProbs();

    const stage1 = {
      type: jsPsychHtmlButtonResponse,
      stimulus: '<p>ステージ1</p><div style="font-size: 80px;">🔺　　　🔶</div>',
      choices: ['左', '右'],
      data: { stage: 1, trial: trial_counter },
      on_finish: function (data) {
        data.choice_stage1 = data.response;
        const common = Math.random() < transition_prob;
        const transition = common ? 'common' : 'rare';
        let state2 = (data.response === 0) ? (common ? 0 : 1) : (common ? 1 : 0);
        data.transition = transition;
        data.state2 = state2;
      }
    };

    const stage2 = {
      type: jsPsychHtmlButtonResponse,
      stimulus: function () {
        const last = jsPsych.data.get().last(1).values()[0];
        let state = (last && last.state2 !== undefined) ? last.state2 : 0;
        const symbols = [['🔵', '🟡'], ['🟢', '🟣']];
        return `<p>ステージ2 - 状態 ${state}</p><div style="font-size: 80px;">${symbols[state][0]}　　　${symbols[state][1]}</div>`;
      },
      choices: ['左', '右'],
      data: { stage: 2, trial: trial_counter },
      on_finish: function (data) {
        const last = jsPsych.data.get().last(2).values()[0];
        const state = (last && last.state2 !== undefined) ? last.state2 : 0;
        const choice = data.response;
        const reward_prob = reward_probs[`state${state}`][choice];
        const reward = Math.random() < reward_prob ? 1 : 0;
        data.state2 = state;
        data.choice_stage2 = choice;
        data.reward = reward;
      }
    };

    const feedback = {
      type: jsPsychHtmlButtonResponse,
      stimulus: function () {
        const reward = jsPsych.data.get().last(1).values()[0].reward;
        return reward ? "<p>💰報酬を得ました！</p>" : "<p>🙁報酬はありません</p>";
      },
      choices: ['次へ']
    };

    timeline.push(stage1, stage2, feedback);
    trial_counter++;
  }

  const memory_trial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: '<p>直前のステージ1でどちらを選びましたか？</p>',
    choices: ['左', '右'],
    data: { task: 'memory_test' },
    on_finish: function (data) {
      const last_stage1 = jsPsych.data.get().filter({ stage: 1 }).last(1).values()[0];
      data.correct_choice = last_stage1.response;
      data.memory_correct = data.response == data.correct_choice ? 1 : 0;
    }
  };

  const confidence_trial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: '<p>自信はありますか？</p>',
    choices: ['ある', 'ない'],
    data: { task: 'confidence' }
  };

  const gamble_trial = {
    type: jsPsychHtmlButtonResponse,
    stimulus: '<p>記憶が正しいと信じてポイントを賭けますか？</p>',
    choices: ['賭ける', '賭けない'],
    data: { task: 'gamble' }
  };

  timeline.push(memory_trial, confidence_trial, gamble_trial);
}

jsPsych.data.addProperties({
  subject: getSubjectId()
});

firebase.auth().signInAnonymously().then(() => {
  const subjectId = getSubjectId();
  jsPsych.run(timeline);
  jsPsych.getDisplayElement().addEventListener("jspsych-complete", function () {
    const data = jsPsych.data.get().json();
    firebase.database().ref("data/" + subjectId).set({
      timestamp: Date.now(),
      data: JSON.parse(data)
    }).then(() => {
      alert("✅ データがFirebaseに保存されました");
    }).catch((error) => {
      alert("❌ 保存に失敗: " + error.message);
    });
  });
});

