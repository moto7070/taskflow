import { NextResponse } from "next/server";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  const csrf = verifyCsrfOrigin(req);
  if (!csrf.ok) {
    return NextResponse.json({ error: csrf.error }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ message: "Not implemented" }, { status: 501 });
}
