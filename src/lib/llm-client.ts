export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmProvider {
  name?: string
  baseUrl: string
  apiKey: string
  models: string[]
}

export interface LlmRequestOptions {
  temperature?: number
  maxTokens?: number
  maxRetriesPerModel?: number
  baseDelayMs?: number
}

export interface LlmResult {
  provider: string
  model: string
  content: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function tryModel(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
  maxRetries: number,
  baseDelayMs: number,
): Promise<string | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      })

      if (res.ok) {
        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[]
        }
        return data.choices?.[0]?.message?.content ?? ''
      }

      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after'))
        const delay = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : baseDelayMs * Math.pow(2, attempt) + Math.random() * 250
        await sleep(delay)
        continue
      }

      return null
    } catch {
      await sleep(baseDelayMs * Math.pow(2, attempt) + Math.random() * 250)
    }
  }
  return null
}

export async function chatWithFallback(
  providers: LlmProvider[],
  messages: ChatMessage[],
  options: LlmRequestOptions = {},
): Promise<LlmResult> {
  const {
    temperature = 0.7,
    maxTokens = 2048,
    maxRetriesPerModel = 4,
    baseDelayMs = 800,
  } = options

  const errors: string[] = []

  for (const provider of providers) {
    const providerName = provider.name ?? provider.baseUrl
    for (const model of provider.models) {
      const content = await tryModel(
        provider.baseUrl,
        provider.apiKey,
        model,
        messages,
        temperature,
        maxTokens,
        maxRetriesPerModel,
        baseDelayMs,
      )
      if (content !== null) {
        return { provider: providerName, model, content }
      }
      errors.push(`${providerName} :: ${model} failed`)
    }
  }

  throw new Error(`All providers/models failed.\n${errors.join('\n')}`)
}
