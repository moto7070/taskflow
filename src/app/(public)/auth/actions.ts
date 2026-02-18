"use server";

import { redirect } from "next/navigation";

import { getAppUrl } from "@/lib/app-url";
import { createClient } from "@/utils/supabase/server";

function withQuery(path: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `${path}?${search.toString()}`;
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signupAction(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!email || !password) {
    redirect(withQuery("/auth/signup", { error: "メールアドレスとパスワードを入力してください" }));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/callback`,
    },
  });

  if (error) {
    redirect(withQuery("/auth/signup", { error: error.message }));
  }

  redirect(withQuery("/auth/login", { message: "確認メールを送信しました" }));
}

export async function loginAction(formData: FormData) {
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!email || !password) {
    redirect(withQuery("/auth/login", { error: "メールアドレスとパスワードを入力してください" }));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(withQuery("/auth/login", { error: error.message }));
  }

  redirect("/app");
}

export async function forgotPasswordAction(formData: FormData) {
  const email = getString(formData, "email");

  if (!email) {
    redirect(withQuery("/auth/forgot-password", { error: "メールアドレスを入力してください" }));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppUrl()}/auth/callback?next=/auth/reset-password`,
  });

  if (error) {
    redirect(withQuery("/auth/forgot-password", { error: error.message }));
  }

  redirect(withQuery("/auth/forgot-password", { message: "再設定メールを送信しました" }));
}

export async function resetPasswordAction(formData: FormData) {
  const password = getString(formData, "password");

  if (!password) {
    redirect(withQuery("/auth/reset-password", { error: "新しいパスワードを入力してください" }));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(withQuery("/auth/login", { error: "パスワード再設定リンクからアクセスしてください" }));
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(withQuery("/auth/reset-password", { error: error.message }));
  }

  redirect(withQuery("/auth/login", { message: "パスワードを更新しました" }));
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(withQuery("/auth/login", { message: "ログアウトしました" }));
}
