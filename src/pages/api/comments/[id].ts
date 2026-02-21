export const prerender = false;
import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

async function getSession(cookies: any) {
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");
  if (!accessToken || !refreshToken) return null;
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken.value,
    refresh_token: refreshToken.value,
  });
  if (error || !data.user) return null;
  return data;
}

// POST /api/comments/:id — toggle like
export const POST: APIRoute = async ({ params, cookies }) => {
  const session = await getSession(cookies);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = params;
  const userId = session.user.id;

  const { data: existingLike } = await supabase
    .from("comment_likes")
    .select("id")
    .eq("comment_id", id)
    .eq("user_id", userId)
    .single();

  if (existingLike) {
    await supabase.from("comment_likes").delete().eq("id", existingLike.id);
    return new Response(JSON.stringify({ liked: false }), {
      headers: { "Content-Type": "application/json" },
    });
  } else {
    await supabase.from("comment_likes").insert({ comment_id: id, user_id: userId });
    return new Response(JSON.stringify({ liked: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }
};

// DELETE /api/comments/:id — delete a comment
export const DELETE: APIRoute = async ({ params, cookies }) => {
  const session = await getSession(cookies);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = params;

  const { data: comment } = await supabase
    .from("comments")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!comment || comment.user_id !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) return new Response(error.message, { status: 500 });

  return new Response(null, { status: 204 });
};
