// Normalise a UK mobile to E.164 (+447...) for WhatsApp
export function toE164(mobile: string): string | null {
  const digits = mobile.replace(/\D/g, '')
  if (digits.startsWith('447') && digits.length === 12) return `+${digits}`
  if (digits.startsWith('7') && digits.length === 10) return `+44${digits}`
  if (digits.startsWith('07') && digits.length === 11) return `+44${digits.slice(1)}`
  if (digits.startsWith('44') && digits.length === 12) return `+${digits}`
  return null
}

export async function sendWhatsAppText(to: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !token) {
    return { ok: false, error: 'WhatsApp not configured' }
  }

  const number = toE164(to)
  if (!number) {
    return { ok: false, error: `Could not parse phone number: ${to}` }
  }

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: number,
        type: 'text',
        text: { body: message },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err as any)?.error?.message ?? `HTTP ${res.status}`
    return { ok: false, error: msg }
  }

  return { ok: true }
}

export async function sendWhatsAppTemplate(to: string, templateName: string, components: string[]): Promise<{ ok: boolean; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !token) return { ok: false, error: 'WhatsApp not configured' }

  const number = toE164(to)
  if (!number) return { ok: false, error: `Could not parse phone number: ${to}` }

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: number,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en_GB' },
          components: [{
            type: 'body',
            parameters: components.map(text => ({ type: 'text', text })),
          }],
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return { ok: false, error: (err as any)?.error?.message ?? `HTTP ${res.status}` }
  }
  return { ok: true }
}
