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
  const params = new URLSearchParams(window.location.search);
  return params.get("subject") || "unknown";
}

const timeline = [];
let recent_stage1_data = [];  // 記憶賭け用に stage1 の選択肢履歴を保持

for (let block = 0; block < num_trials / trials_per_block; block++) {
  const block_trials = [];
  const gamble_index = Math.floor(Math.random() * (trials_per_block - 2)) + 2; // index: 2〜4 のどこか

  for (let i = 0; i < trials_per_block; i++) {
    const global_trial_index = block * trials_per_block + i;

    updateRewardProbs();

    const stage1 = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: '<p>ステージ1</p><div style="font-size: 80px;">🔺　　　🔶</div><p>左: Fキー | 右: Jキー</p>',
      choices: ['f', 'j'],
      data: { stage: 1, trial: global_trial_index + 1 },
      on_finish: function (data) {
        data.choice_stage1 = data.response === 'f' ? 0 : 1;
        const common = Math.random() < transition_prob;
        const transition = common ? 'common' : 'rare';
        let state2 = data.choice_stage1 === 0 ? (common ? 0 : 1) : (common ? 1 : 0);
        data.transition = transition;
        data.state2 = state2;
        recent_stage1_data.push({ choice_stage1: data.choice_stage1 });
        if (recent_stage1_data.length > 10) recent_stage1_data.shift();  // 保持数制限
      }
    };

    const stage2 = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function () {
        const last_data = jsPsych.data.get().last(1).values()[0];
        const state = (last_data && last_data.state2 !== undefined) ? last_data.state2 : 0;
        const symbols = [['🔵', '🟡'], ['🟢', '🟣']];
        return `<p>ステージ2 - 状態 ${state}</p>
                <div style="font-size: 80px;">${symbols[state][0]}　　　${symbols[state][1]}</div>
                <p>左: Fキー | 右: Jキー</p>`;
      },
      choices: ['f', 'j'],
      data: { stage: 2, trial: global_trial_index + 1 },
      on_finish: function (data) {
        const last_data = jsPsych.data.get().last(2).values()[0];
        const state = (last_data && last_data.state2 !== undefined) ? last_data.state2 : 0;
        const choice = data.response === 'f' ? 0 : 1;
        const reward_prob = reward_probs[`state${state}`][choice];
        const reward = Math.random() < reward_prob ? 1 : 0;
        data.state2 = state;
        data.choice_stage2 = choice;
        data.reward = reward;
        total_reward += reward;
      }
    };

    const feedback = {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function () {
        const reward = jsPsych.data.get().last(1).values()[0].reward;
        return reward ? "<p>💰報酬を得ました！</p>" : "<p>🙁報酬はありません</p>";
      },
      choices: ['f', 'j']
    };

    block_trials.push(stage1, stage2, feedback);

    // 記憶賭け挿入タイミングならここで追加
    if (i === gamble_index) {
      const memory_trial = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function () {
          const recent = recent_stage1_data[recent_stage1_data.length - 1];
          if (!recent) return "<p>記憶データが見つかりません。</p>";
          return `<p>記憶テスト：直前のステージ1で選択したのは？</p>
                  <div style="font-size: 80px;">🔺　　　🔶</div>
                  <p>左: Fキー | 右: Jキー</p>`;
        },
        choices: ['f', 'j'],
        on_finish: function (data) {
          const recent = recent_stage1_data[recent_stage1_data.length - 1];
          const response = data.response === 'f' ? 0 : 1;
          data.memory_response = response;
          data.memory_correct = (recent && response === recent.choice_stage1);
        }
      };

      const gamble = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `<p>記憶の正しさにポイントを賭けますか？</p>
                   <p style="font-size:30px;">はい：Yキー</p>
                   <p style="font-size:30px;">いいえ：Nキー</p>`,
        choices: ['y', 'n'],
        on_finish: function (data) {
          const memory = jsPsych.data.get().last(2).values()[0];
          const gamble = data.response === 'y';
          const won = gamble && memory.memory_correct;
          data.gambled = gamble;
          data.gamble_win = won;
          if (won) total_points += 1;
        }
      };

      block_trials.push(memory_trial, gamble);
    }
  }

  timeline.push(...block_trials);
}

jsPsych.data.addProperties({ subject: getSubjectId() });

firebase.auth().signInAnonymously().then(() => {
  const subjectId = getSubjectId();

  const jsPsych = initJsPsych({
    on_finish: function () {
      const data = jsPsych.data.get().json();
      firebase.database().ref("data/" + subjectId).set({
        timestamp: Date.now(),
        total_reward: total_reward,
        total_points: total_points,
        data: JSON.parse(data)
      }).then(() => {
        alert("✅ データがFirebaseに保存されました\n報酬合計: " + total_reward + "\nポイント合計: " + total_points);
      }).catch((error) => {
        alert("❌ 保存に失敗: " + error.message);
      });
    }
  });

  jsPsych.data.addProperties({ subject: subjectId });
  jsPsych.run(timeline);
});
