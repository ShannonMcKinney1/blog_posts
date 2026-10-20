import { useState, useEffect } from "react";
import { pb } from "../lib/pocketbase";
import { useUser } from "../lib/useUser";
import Auth from "./Auth";

interface Profile {
  username: string;
  avatarUrl: string | null;
}

interface CommentLike {
  userId: string;
}

interface Comment {
  id: string;
  postSlug: string;
  userId: string;
  content: string;
  created: string;
  parentId: string | null;
  profiles: Profile;
  commentLikes: CommentLike[];
}

interface Props {
  slug: string;
}

const toComment = (record: any, likes: CommentLike[] = []): Comment => {
  const author = record.expand?.userId;
  return {
    ...record,
    parentId: record.parentId || null,
    profiles: {
      username: author?.username || author?.name || "Anonymous",
      avatarUrl: null,
    },
    commentLikes: likes,
  };
};

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
  const likeCount = comment.commentLikes.length;
  const userLiked = userId
    ? comment.commentLikes.some((l) => l.userId === userId)
    : false;
  const isOwner = userId === comment.userId;
  const replies = allComments.filter((c) => c.parentId === comment.id);

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
          <span className="text-xs text-gray-400">{timeAgo(comment.created)}</span>
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
  const userId = useUser()?.id ?? null;

  useEffect(() => {
    async function fetchComments() {
      try {
        const [records, likes] = await Promise.all([
          pb.collection("comments").getFullList({
            filter: pb.filter("postSlug = {:slug}", { slug }),
            sort: "created",
            expand: "userId",
          }),
          pb.collection("comment_likes").getFullList({
            filter: pb.filter("commentId.postSlug = {:slug}", { slug }),
          }),
        ]);
        setComments(
          records.map((r) =>
            toComment(
              r,
              likes
                .filter((l) => l.commentId === r.id)
                .map((l) => ({ userId: l.userId })),
            ),
          ),
        );
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
      const record = await pb.collection("comments").create(
        {
          postSlug: slug,
          userId: userId,
          content: newComment.trim(),
          parentId: parentId || "",
        },
        { expand: "userId" },
      );

      setComments((prev) => [...prev, toComment(record)]);
      setNewComment("");
      setReplyingTo(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await pb.collection("comments").delete(id);
      setComments((prev) => prev.filter((c) => c.id !== id && c.parentId !== id));
    } catch {
      // leave the comment in place if the delete was rejected
    }
  };

  const handleLike = async (id: string) => {
    if (!userId) return;

    const { items } = await pb.collection("comment_likes").getList(1, 1, {
      filter: pb.filter("commentId = {:id} && userId = {:userId}", { id, userId }),
    });
    const existingLike = items[0];

    if (existingLike) {
      await pb.collection("comment_likes").delete(existingLike.id);
    } else {
      await pb.collection("comment_likes").create({ commentId: id, userId: userId });
    }

    const liked = !existingLike;
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          commentLikes: liked
            ? [...c.commentLikes, { userId: userId }]
            : c.commentLikes.filter((l) => l.userId !== userId),
        };
      })
    );
  };

  const topLevel = comments.filter((c) => !c.parentId);

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
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">Sign in to leave a comment.</p>
          <Auth />
        </div>
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
