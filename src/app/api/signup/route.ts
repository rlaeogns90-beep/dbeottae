import { signup, type SignupInput } from "@/lib/accounts";
import { mutate } from "@/lib/server/db";

export async function POST(req: Request) {
  const input = (await req.json()) as SignupInput;
  const error = await mutate((s) => {
    const r = signup(s, input);
    return "error" in r ? { state: s, result: r.error } : { state: r.state, result: null };
  });
  return error ? Response.json({ error }, { status: 400 }) : Response.json({ ok: true });
}
