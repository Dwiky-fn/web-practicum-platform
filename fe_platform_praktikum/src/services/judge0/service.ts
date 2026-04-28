import { apiFetch } from "../api"

export const runCode = async (
  source_code: string,
  language_id: number,
  stdin?: string
) => {
  const res = await apiFetch("/judge0/run", {
    method: "POST",
    body: JSON.stringify({
      source_code,
      language_id,
      stdin,
    }),
  })

  return res.data
}