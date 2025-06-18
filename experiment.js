// JavaScript source code
const jsPsych = initJsPsych({
  on_finish: function () {
    jsPsych.data.displayData();  // ✅ 実験終了後にデータ表示
  }
});

const num_trials = 5; // テスト用に5試行にしておく
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

function saveData(filename, filedata) {
  fetch('save_data.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: filename, filedata: filedata })
  }).then(response => {
    if (!response.ok) {
      alert("⚠️ データ保存に失敗しました");
    }
  });
}

const timeline = [];

for (let i = 0; i < num_trials; i++) {
  updateRewardProbs();

  const stage1 = {
    type: jsPsychHtmlButtonResponse,
    stimulus: '<p>ステージ1</p><div style="font-size: 80px;">🔺　　　🔶</div>',
    choices: ['左', '右'],
    data: { stage: 1, trial: i + 1 },
    on_finish: function (data) {
      data.choice_stage1 = data.response;
      const common = Math.random() < transition_prob;
      const transition = common ? 'common' : 'rare';
      let state2;
      if (data.response === 0) {
        state2 = common ? 0 : 1;
      } else {
        state2 = common ? 1 : 0;
      }
      data.transition = transition;
      data.state2 = state2;
    }
  };

  const stage2 = {
    type: jsPsychHtmlButtonResponse,
    stimulus: function () {
      const state = jsPsych.data.get().last(1).values()[0].state2;
      const symbols = [
        ['🔵', '🟡'],  // state0
        ['🟢', '🟣']   // state1
      ];
      const left = symbols[state][0];
      const right = symbols[state][1];
      return `<p>ステージ2 - 状態 ${state}</p><div style="font-size: 80px;">${left}　　　${right}</div>`;
    },
    choices: ['左', '右'],
    data: { stage: 2, trial: i + 1 },
    on_finish: function (data) {
      const state = jsPsych.data.get().last(2).values()[0].state2;
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
}
// 被験者番号を記録する（ここに追加）
jsPsych.data.addProperties({
  subject: getSubjectId()
});
// 被験者IDの取得
function getSubjectId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("subject") || "unknown";
}

// Firebase匿名認証 → 実験開始
firebase.auth().signInAnonymously().then(() => {
  const subjectId = getSubjectId();

  // Firebase保存付き実験終了処理
  const jsPsych = initJsPsych({
    on_finish: function () {
      const data = jsPsych.data.get().json();
      firebase.database().ref("data/" + subjectId).set({
        timestamp: Date.now(),
        data: JSON.parse(data)
      }).then(() => {
        alert("✅ データがFirebaseに保存されました");
      }).catch((error) => {
        alert("❌ 保存に失敗: " + error.message);
      });
    }
  });

  jsPsych.data.addProperties({
    subject: subjectId
  });

    jsPsych.run(timeline);

});  // firebase.auth().signInAnonymously().then(... の閉じ括弧


