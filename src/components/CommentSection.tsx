import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

interface Profile {
  username: string;
  avatar_url: string | null;
}

interface CommentLike {
  user_id: string;
}

interface Comment {
  id: string;
  post_slug: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  profiles: Profile;
  comment_likes: CommentLike[];
}

interface Props {
  slug: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface CommentItemProps {
  comment: Comment;
  allComments: Comment[];
  userId: string | null;
  slug: string;
  onDelete: (id: string) => void;
  onLike: (id: string) => void;
  onReply: (comment: Comment) => void;
  depth: number;
}

function CommentItem({
  comment,
  allComments,
  userId,
  slug,
  onDelete,
  onLike,
  onReply,
  depth,
}: CommentItemProps) {
  const likeCount = comment.comment_likes.length;
  const userLiked = userId
    ? comment.comment_likes.some((l) => l.user_id === userId)
    : false;
  const isOwner = userId === comment.user_id;
  const replies = allComments.filter((c) => c.parent_id === comment.id);

  return (
    <div
      style={{ marginLeft: depth > 0 ? "1.5rem" : "0" }}
      className="border-l-2 border-gray-200 pl-3 mt-3 mb-3"
    >
      <div className="bg-white rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">
            {comment.profiles?.username ?? "Anonymous"}
          </span>
          <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.content}</p>
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => onLike(comment.id)}
            disabled={!userId}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
              userLiked
                ? "text-red-500 bg-red-50 hover:bg-red-100"
                : "text-gray-500 bg-gray-50 hover:bg-gray-100"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={userId ? undefined : "Sign in to like"}
          >
            <span>{userLiked ? "♥" : "♡"}</span>
            <span>{likeCount}</span>
          </button>
          {userId && depth < 3 && (
            <button
              onClick={() => onReply(comment)}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              Reply
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-xs text-red-400 hover:text-red-600 ml-auto"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      {replies.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          allComments={allComments}
          userId={userId}
          slug={slug}
          onDelete={onDelete}
          onLike={onLike}
          onReply={onReply}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function CommentSection({ slug }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    async function fetchComments() {
      try {
        const { data } = await supabase
          .from("comments")
          .select(`
            *,
            profiles(username, avatar_url),
            comment_likes(user_id)
          `)
          .eq("post_slug", slug)
          .order("created_at", { ascending: true });
        setComments((data as Comment[]) ?? []);
      } catch {
        setComments([]);
      } finally {
        setLoading(false);
      }
    }
    fetchComments();
  }, [slug]);

  const handleSubmit = async (e: React.SyntheticEvent, parentId?: string) => {
    e.preventDefault();
    if (!newComment.trim() || !userId) return;
    setSubmitting(true);
    setError("");

    try {
      const { data, error: insertError } = await supabase
        .from("comments")
        .insert({
          post_slug: slug,
          user_id: userId,
          content: newComment.trim(),
          parent_id: parentId || null,
        })
        .select(`*, profiles(username, avatar_url), comment_likes(user_id)`)
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setComments((prev) => [...prev, data as Comment]);
      setNewComment("");
      setReplyingTo(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    const { error: deleteError } = await supabase
      .from("comments")
      .delete()
      .eq("id", id);
    if (!deleteError) {
      setComments((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
    }
  };

  const handleLike = async (id: string) => {
    if (!userId) return;

    const { data: existingLike } = await supabase
      .from("comment_likes")
      .select("id")
      .eq("comment_id", id)
      .eq("user_id", userId)
      .single();

    if (existingLike) {
      await supabase.from("comment_likes").delete().eq("id", existingLike.id);
    } else {
      await supabase.from("comment_likes").insert({ comment_id: id, user_id: userId });
    }

    const liked = !existingLike;
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          comment_likes: liked
            ? [...c.comment_likes, { user_id: userId }]
            : c.comment_likes.filter((l) => l.user_id !== userId),
        };
      })
    );
  };

  const topLevel = comments.filter((c) => c.parent_id === null);

  return (
    <div className="mt-10 border-t pt-8">
      <h2 className="text-xl font-bold mb-4">
        Comments ({comments.length})
      </h2>

      {userId ? (
        <form onSubmit={(e) => handleSubmit(e)} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Leave a comment..."
            rows={3}
            className="w-full rounded-lg p-3 text-sm resize-none focus:outline-none"
            style={{ border: '2px solid #d3acd7', backgroundColor: '#eae1f4' }}
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="mt-2 px-4 py-2 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#8c1a6a', border: 'none' }}
          >
            {submitting ? "Posting..." : "Post Comment"}
          </button>
        </form>
      ) : (
        <p className="mb-6 text-sm text-gray-500">
          <a href="/signin" className="hover:underline" style={{ color: '#8c1a6a' }}>
            Sign in
          </a>{" "}
          to leave a comment.
        </p>
      )}

      {replyingTo && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-gray-500 mb-2">
            Replying to <strong>{replyingTo.profiles?.username}</strong>
            <button
              onClick={() => { setReplyingTo(null); setNewComment(""); }}
              className="ml-2 text-red-400 hover:text-red-600"
            >
              Cancel
            </button>
          </p>
          <form onSubmit={(e) => handleSubmit(e, replyingTo.id)}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={`Reply to ${replyingTo.profiles?.username}...`}
              rows={2}
              className="w-full rounded-lg p-2 text-sm resize-none focus:outline-none"
              style={{ border: '2px solid #d3acd7', backgroundColor: '#eae1f4' }}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="mt-2 px-3 py-1 text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#8c1a6a', border: 'none' }}
            >
              {submitting ? "Posting..." : "Post Reply"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading comments...</p>
      ) : topLevel.length === 0 ? (
        <p className="text-sm text-gray-400">No comments yet. Be the first!</p>
      ) : (
        <div>
          {topLevel.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              allComments={comments}
              userId={userId}
              slug={slug}
              onDelete={handleDelete}
              onLike={handleLike}
              onReply={(c) => { setReplyingTo(c); setNewComment(""); }}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
