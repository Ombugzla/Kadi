export async function generateBotReply({ endpoint, bot, messages }) {
  if (!endpoint) throw new Error('AI chat endpoint is not configured.');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bot: { id: bot.id, name: bot.name },
      messages: messages.slice(-12).map(({ role, content }) => ({
        role,
        content: String(content).slice(0, 600),
      })),
    }),
    signal: AbortSignal.timeout(25000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || `AI service returned ${response.status}.`);
  if (typeof result?.reply !== 'string' || !result.reply.trim()) {
    throw new Error('AI service returned an empty reply.');
  }
  return result.reply.trim().slice(0, 600);
}
