/* ============================================================
   LINGO — ИИ-учитель (Cloudflare Worker)
   Проверяет письменные ответы ученика и возвращает разбор в JSON.

   Что нужно задать в настройках Worker (Settings → Variables):
     ANTHROPIC_API_KEY  — твой ключ с console.anthropic.com  (тип: Secret)
     MODEL              — (необязательно) модель, по умолчанию claude-haiku-4-5
   ============================================================ */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Кто может обращаться к серверу (защита от чужого использования твоих средств)
function originAllowed(request) {
  const o = request.headers.get('Origin') || '';
  return (
    o.includes('myko0000586.github.io') ||
    o.includes('localhost') ||
    o.includes('127.0.0.1')
  );
}

export default {
  async fetch(request, env) {
    // preflight
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);
    if (!originAllowed(request)) return json({ error: 'Forbidden origin' }, 403);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Bad JSON' }, 400); }

    if (!env.ANTHROPIC_API_KEY) return json({ error: 'Server is missing ANTHROPIC_API_KEY' }, 500);
    const model = env.MODEL || 'claude-haiku-4-5';
    const level = (body.level || 'A2').toString();

    // ===== Режим ДИАЛОГА =====
    if (body.mode === 'chat') {
      return await handleChat(body, env, model, level);
    }

    // ===== Режим ПРОВЕРКИ ПИСЬМА =====
    const text = (body.text || '').toString().slice(0, 2000);
    const task = (body.task || '').toString().slice(0, 500);
    if (!text) return json({ error: 'No text' }, 400);

    const system =
      `Ты — доброжелательный, но требовательный преподаватель английского языка. ` +
      `Ученик — носитель русского языка, уровень ${level} (CEFR). ` +
      `Проверяй его письменный ответ: грамматику, порядок слов, артикли, времена, лексику и орфографию. ` +
      `Объяснения и комментарии давай НА РУССКОМ языке, исправленный текст — на английском. ` +
      `Будь конкретным, ободряющим и кратким. Не придирайся к стилю сверх уровня ученика.`;

    const userMsg =
      `Задание (на русском): ${task || '(свободное письмо)'}\n\n` +
      `Ответ ученика (English): "${text}"\n\n` +
      `Проверь ответ и верни результат строго через инструмент grade_writing.`;

    // Структурированный вывод через tool use
    const tool = {
      name: 'grade_writing',
      description: 'Вернуть разбор письменного ответа ученика',
      input_schema: {
        type: 'object',
        properties: {
          score: { type: 'integer', description: 'Оценка 0–100 за этот ответ' },
          summary: { type: 'string', description: 'Краткий итог на русском (1 предложение)' },
          corrected: { type: 'string', description: 'Исправленный, корректный вариант на английском' },
          mistakes: {
            type: 'array',
            description: 'Список ошибок (если есть)',
            items: {
              type: 'object',
              properties: {
                wrong: { type: 'string', description: 'Как написал ученик' },
                right: { type: 'string', description: 'Как правильно' },
                why:   { type: 'string', description: 'Почему — объяснение на русском' },
              },
              required: ['wrong', 'right', 'why'],
            },
          },
          encouragement: { type: 'string', description: 'Короткая ободряющая фраза на русском' },
        },
        required: ['score', 'summary', 'corrected', 'mistakes', 'encouragement'],
      },
    };

    let resp;
    try {
      resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system,
          tools: [tool],
          tool_choice: { type: 'tool', name: 'grade_writing' },
          messages: [{ role: 'user', content: userMsg }],
        }),
      });
    } catch (e) {
      return json({ error: 'Upstream fetch failed: ' + e.message }, 502);
    }

    if (!resp.ok) {
      const t = await resp.text();
      return json({ error: 'Anthropic error ' + resp.status, detail: t.slice(0, 300) }, 502);
    }

    const data = await resp.json();
    const toolUse = (data.content || []).find((c) => c.type === 'tool_use');
    if (!toolUse) return json({ error: 'No structured output' }, 502);

    return json(toolUse.input, 200);
  },
};

/* ===== Диалог-урок с учителем ===== */
async function handleChat(body, env, model, level) {
  const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  if (!messages.length) return json({ error: 'No messages' }, 400);

  const system =
    `Ты — дружелюбный преподаватель английского, ведёшь живой разговорный урок с учеником. ` +
    `Ученик — носитель русского языка, уровень ${level} (CEFR). ` +
    `ПРАВИЛА: говори простым английским языком уровня ${level}, короткими репликами (1–3 предложения). ` +
    `Поддерживай беседу, задавай встречные вопросы, будь тёплым и терпеливым. ` +
    `Если ученик сделал ошибку — НЕ прерывай беседу: в поле reply отвечай по-английски и продолжай диалог, ` +
    `а в поле correction дай короткую подсказку НА РУССКОМ (что поправить и как правильно). Если ошибок нет — оставь correction пустым.`;

  const tool = {
    name: 'chat_reply',
    description: 'Ответ учителя в диалоге',
    input_schema: {
      type: 'object',
      properties: {
        reply: { type: 'string', description: 'Реплика учителя на английском (продолжение беседы)' },
        correction: { type: 'string', description: 'Краткая подсказка на русском об ошибке ученика, или пустая строка' },
      },
      required: ['reply', 'correction'],
    },
  };

  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        system,
        tools: [tool],
        tool_choice: { type: 'tool', name: 'chat_reply' },
        messages,
      }),
    });
  } catch (e) {
    return json({ error: 'Upstream fetch failed: ' + e.message }, 502);
  }
  if (!resp.ok) {
    const t = await resp.text();
    return json({ error: 'Anthropic error ' + resp.status, detail: t.slice(0, 300) }, 502);
  }
  const data = await resp.json();
  const toolUse = (data.content || []).find((c) => c.type === 'tool_use');
  if (!toolUse) return json({ error: 'No structured output' }, 502);
  return json(toolUse.input, 200);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
