export const prerender = false;
import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get("slug");
  if (!slug) {
    return new Response("slug is required", { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .select(`
      *,
      profiles(username, avatar_url),
      comment_likes(user_id)
    `)
    .eq("post_slug", slug)
    .order("created_at", { ascending: true });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");

  if (!accessToken || !refreshToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken.value,
    refresh_token: refreshToken.value,
  });

  if (sessionError || !sessionData.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { slug, content, parent_id } = body;

  if (!slug || !content?.trim()) {
    return new Response("slug and content are required", { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_slug: slug,
      user_id: sessionData.user.id,
      content: content.trim(),
      parent_id: parent_id || null,
    })
    .select(`*, profiles(username, avatar_url), comment_likes(user_id)`)
    .single();

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
