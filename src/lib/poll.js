export const POLL_COLORS = [
  "#8be9ed",
  "#ffad82",
  "#c8b6ff",
  "#a8e6b2",
  "#ffd97e",
  "#a8c8ff",
];

export function pollResult(card) {
  const votes = Array.isArray(card.votes) ? card.votes : [];
  const options =
    Array.isArray(card.options) && card.options.length
      ? card.options
      : ["YES", "NO"];
  const groups = options.map((option, index) => ({
    option,
    index,
    label: String.fromCharCode(65 + index),
    color: POLL_COLORS[index],
    votes: votes.filter(
      (v) =>
        String(v.finalVote || v.vote).toLowerCase() ===
        String(option).toLowerCase(),
    ),
  }));
  const valid = groups.reduce((sum, g) => sum + g.votes.length, 0);
  return {
    votes,
    groups,
    valid,
    total: (card.models || []).length || votes.length,
    invalid: votes.filter((v) => !groups.some((g) => g.votes.includes(v))),
  };
}

export function pollSummary(card, lang = "en") {
  const { groups, valid } = pollResult(card),
    zh = lang === "zh";
  if (!valid)
    return zh
      ? "尚无有效投票，无法判断多数意见。"
      : "There are no valid votes yet, so no majority can be determined.";
  const sorted = [...groups].sort((a, b) => b.votes.length - a.votes.length),
    winner = sorted[0],
    tie =
      sorted.filter((g) => g.votes.length === winner.votes.length).length > 1;
  if (tie)
    return zh
      ? `有效投票共 ${valid} 票，最高票选项并列。请查看各模型理由和仍存在的分歧。`
      : `There are ${valid} valid votes, with a tie for the highest count. Review the reasons and remaining differences.`;
  const other = sorted
    .filter((g) => g.votes.length && g !== winner)
    .map(
      (g) =>
        `${g.votes.map((v) => v.modelName || v.modelId).join(", ")} → ${g.option}`,
    )
    .join("; ");
  return zh
    ? `${valid} 张有效票中，${winner.votes.length} 个模型选择「${winner.option}」。${other ? `其他立场：${other}。` : ""}这是模型投票结果，结论仍需结合理由和事实判断。`
    : `Of ${valid} valid votes, ${winner.votes.length} models chose “${winner.option}”. ${other ? `Other positions: ${other}. ` : ""}This is a model poll; evaluate the reasons and facts before deciding.`;
}
