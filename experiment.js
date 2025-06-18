const stage2 = {
  type: jsPsychHtmlButtonResponse,
  stimulus: function () {
    const last_data = jsPsych.data.get().last(1).values()[0];
    let state = (last_data && last_data.state2 !== undefined) ? last_data.state2 : 0;

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
    const last_data = jsPsych.data.get().last(1).values()[0];
    const state = (last_data && last_data.state2 !== undefined) ? last_data.state2 : 0;

    const choice = data.response;
    const reward_prob = reward_probs[`state${state}`][choice];
    const reward = Math.random() < reward_pr_


