import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Auth from "./Auth";
import { marked } from "marked";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string | null;
  cover_image: string | null;
  published: boolean;
  published_at: string | null;
  author_id: string | null;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const toLocalDatetime = (iso: string | null): string => {
  const d = iso ? new Date(iso) : new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d3acd7",
  borderRadius: 6,
  backgroundColor: "#eae1f4",
  fontSize: "0.95rem",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 600,
  fontSize: "0.85rem",
  marginBottom: 4,
  padding: 0,
};

const fieldStyle: React.CSSProperties = { marginBottom: "1.25rem" };

const btnPrimary: React.CSSProperties = {
  backgroundColor: "#8c1a6a",
  color: "white",
  border: "none",
  padding: "9px 22px",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.95rem",
};

const btnSecondary: React.CSSProperties = {
  background: "none",
  border: "1px solid #d3acd7",
  padding: "9px 22px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: "0.95rem",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [view, setView] = useState<"list" | "editor">("list");
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchAll();
  }, [userId]);

  const fetchAll = async () => {
    const [postsRes, tagsRes] = await Promise.all([
      supabase.from("posts").select("*").order("published_at", { ascending: false }),
      supabase.from("tags").select("*").order("name"),
    ]);
    setPosts(postsRes.data ?? []);
    setTags(tagsRes.data ?? []);
  };

  const handleDelete = async (post: Post) => {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    await supabase.from("posts").delete().eq("id", post.id);
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
  };

  if (loading) return <p style={{ padding: "2rem" }}>Loading...</p>;

  if (!userId) {
    return (
      <div
        style={{
          maxWidth: 420,
          margin: "2rem auto",
          padding: "2rem",
          backgroundColor: "#eae1f4",
          borderRadius: 8,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Admin Sign In</h2>
        <p style={{ marginBottom: "1.5rem" }}>Sign in to manage your posts.</p>
        <Auth
          redirectTo={
            typeof window !== "undefined"
              ? `${window.location.origin}/admin/dashboard`
              : undefined
          }
        />
      </div>
    );
  }

  if (view === "editor") {
    return (
      <PostEditor
        post={editingPost}
        tags={tags}
        userId={userId}
        onSave={async () => {
          await fetchAll();
          setView("list");
          setEditingPost(null);
        }}
        onBack={() => {
          setView("list");
          setEditingPost(null);
        }}
        onTagCreated={(tag) => setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))}
      />
    );
  }

  return (
    <PostList
      posts={posts}
      onNew={() => {
        setEditingPost(null);
        setView("editor");
      }}
      onEdit={(post) => {
        setEditingPost(post);
        setView("editor");
      }}
      onDelete={handleDelete}
    />
  );
}

// ─── Post List ────────────────────────────────────────────────────────────────

interface PostListProps {
  posts: Post[];
  onNew: () => void;
  onEdit: (post: Post) => void;
  onDelete: (post: Post) => void;
}

function PostList({ posts, onNew, onEdit, onDelete }: PostListProps) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ margin: 0, padding: 0 }}>All Posts</h2>
        <button onClick={onNew} style={btnPrimary}>
          + New Post
        </button>
      </div>

      {posts.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            backgroundColor: "#eae1f4",
            borderRadius: 8,
            color: "#666",
          }}
        >
          <p style={{ margin: 0, padding: 0 }}>No posts yet.</p>
          <button onClick={onNew} style={{ ...btnPrimary, marginTop: "1rem" }}>
            Create your first post
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                backgroundColor: "#eae1f4",
                borderRadius: 8,
                borderLeft: `4px solid ${post.published ? "#8c1a6a" : "#d3acd7"}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    padding: 0,
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {post.title}
                </p>
                <p style={{ margin: 0, padding: 0, fontSize: "0.75rem", color: "#666" }}>
                  /blog/{post.slug}
                </p>
              </div>

              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "2px 10px",
                  borderRadius: 12,
                  backgroundColor: post.published ? "#d1ebc1" : "#f0f0f0",
                  color: post.published ? "#2d6a2d" : "#666",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {post.published ? "Published" : "Draft"}
              </span>

              {post.published_at && (
                <span
                  style={{ fontSize: "0.75rem", color: "#666", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  {new Date(post.published_at).toLocaleDateString()}
                </span>
              )}

              <button
                onClick={() => onEdit(post)}
                style={{
                  background: "none",
                  border: "1px solid #d3acd7",
                  padding: "4px 12px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  flexShrink: 0,
                }}
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(post)}
                style={{
                  background: "none",
                  border: "1px solid #e5a0a0",
                  color: "#c0392b",
                  padding: "4px 12px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  flexShrink: 0,
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Post Editor ──────────────────────────────────────────────────────────────

interface PostEditorProps {
  post: Post | null;
  tags: Tag[];
  userId: string;
  onSave: () => Promise<void>;
  onBack: () => void;
  onTagCreated: (tag: Tag) => void;
}

function PostEditor({ post, tags, userId, onSave, onBack, onTagCreated }: PostEditorProps) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [description, setDescription] = useState(post?.description ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [coverImage, setCoverImage] = useState(post?.cover_image ?? "");
  const [published, setPublished] = useState(post?.published ?? false);
  const [publishedAt, setPublishedAt] = useState(toLocalDatetime(post?.published_at ?? null));
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [slugManuallySet, setSlugManuallySet] = useState(!!post);
  const [postImages, setPostImages] = useState<{ name: string; url: string }[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [imageMsg, setImageMsg] = useState<{ text: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (!post) return;
    supabase
      .from("post_tags")
      .select("tag_id")
      .eq("post_id", post.id)
      .then(({ data }) => {
        setSelectedTagIds((data ?? []).map((pt) => pt.tag_id));
      });
  }, [post]);

  useEffect(() => {
    if (post?.slug) fetchImages(post.slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchImages = async (targetSlug: string = slug) => {
    if (!targetSlug) return;
    setImagesLoading(true);
    const { data } = await supabase.storage.from("blog-post-images").list(targetSlug);
    const images = (data ?? [])
      .filter((f) => f.name !== ".emptyFolderPlaceholder")
      .map((f) => {
        const { data: urlData } = supabase.storage
          .from("blog-post-images")
          .getPublicUrl(`${targetSlug}/${f.name}`);
        return { name: f.name, url: urlData.publicUrl };
      });
    setPostImages(images);
    setImagesLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    const MAX_BYTES = 5 * 1024 * 1024;
    for (const file of files) {
      if (!ALLOWED.includes(file.type)) {
        setImageMsg({ text: `"${file.name}" is not a supported image type (jpeg, png, gif, webp).`, isError: true });
        return;
      }
      if (file.size > MAX_BYTES) {
        setImageMsg({ text: `"${file.name}" exceeds the 5MB size limit.`, isError: true });
        return;
      }
    }
    setUploadLoading(true);
    setImageMsg(null);
    const results = await Promise.all(
      files.map((file) =>
        supabase.storage.from("blog-post-images").upload(`${slug}/${file.name}`, file, { upsert: false })
      )
    );
    const failed = results.filter((r) => r.error);
    if (failed.length) {
      const firstError = failed[0].error!.message;
      setImageMsg({ text: `${failed.length} file(s) failed: ${firstError}`, isError: true });
    } else {
      setImageMsg({ text: `${files.length} image(s) uploaded successfully.`, isError: false });
    }
    await fetchImages(slug);
    setUploadLoading(false);
    e.target.value = "";
  };

  const handleCopyMarkdown = async (name: string, url: string) => {
    const alt = name.replace(/\.[^.]+$/, "");
    await navigator.clipboard.writeText(`![${alt}](${url})`);
    setImageMsg({ text: `Copied: ![${alt}](...)`, isError: false });
  };

  const handleDeleteImage = async (name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const { error: delError } = await supabase.storage
      .from("blog-post-images")
      .remove([`${slug}/${name}`]);
    if (delError) {
      setImageMsg({ text: `Failed to delete "${name}": ${delError.message}`, isError: true });
      return;
    }
    setPostImages((prev) => prev.filter((img) => img.name !== name));
    setImageMsg({ text: `"${name}" deleted.`, isError: false });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!slugManuallySet) setSlug(toSlug(val));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setSlugManuallySet(true);
  };

  const toggleTag = (tagId: string) =>
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    const { data, error: tagError } = await supabase
      .from("tags")
      .insert({ name, slug: toSlug(name) })
      .select()
      .single();
    if (tagError) { setError(tagError.message); return; }
    onTagCreated(data as Tag);
    setSelectedTagIds((prev) => [...prev, (data as Tag).id]);
    setNewTagName("");
  };

  const handleSave = async () => {
    if (!title.trim() || !slug.trim()) {
      setError("Title and slug are required.");
      return;
    }
    setSaving(true);
    setError("");

    const postData = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      content: content || null,
      cover_image: coverImage.trim() || null,
      published,
      published_at: published ? new Date(publishedAt).toISOString() : null,
      author_id: userId,
    };

    let postId: string;

    if (post) {
      const { error: updateError } = await supabase
        .from("posts")
        .update(postData)
        .eq("id", post.id);
      if (updateError) { setError(updateError.message); setSaving(false); return; }
      postId = post.id;
    } else {
      const { data, error: insertError } = await supabase
        .from("posts")
        .insert(postData)
        .select("id")
        .single();
      if (insertError) { setError(insertError.message); setSaving(false); return; }
      postId = (data as { id: string }).id;
    }

    await supabase.from("post_tags").delete().eq("post_id", postId);
    if (selectedTagIds.length > 0) {
      await supabase
        .from("post_tags")
        .insert(selectedTagIds.map((tagId) => ({ post_id: postId, tag_id: tagId })));
    }

    await onSave();
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
        <button onClick={onBack} style={btnSecondary}>
          ← Back
        </button>
        <h2 style={{ margin: 0, padding: 0 }}>{post ? "Edit Post" : "New Post"}</h2>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "#fde8e8",
            border: "1px solid #f5c6c6",
            padding: "10px 14px",
            borderRadius: 6,
            color: "#c0392b",
            marginBottom: "1rem",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Title */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Title *</label>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          style={inputStyle}
          placeholder="Post title"
        />
      </div>

      {/* Slug */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Slug *</label>
        <input
          type="text"
          value={slug}
          onChange={handleSlugChange}
          style={inputStyle}
          placeholder="post-slug"
        />
        {slug && (
          <p style={{ margin: "4px 0 0", padding: 0, fontSize: "0.75rem", color: "#666" }}>
            URL: /blog/{slug}
          </p>
        )}
      </div>

      {/* Description */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
          placeholder="Short description for post previews and SEO"
        />
      </div>

      {/* Content */}
      <div style={fieldStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <label style={{ ...labelStyle, marginBottom: 0 }}>Content (Markdown)</label>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            style={{
              background: "none",
              border: "1px solid #d3acd7",
              padding: "3px 12px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            {showPreview ? "✏️ Edit" : "👁 Preview"}
          </button>
        </div>
        {showPreview ? (
          <div
            style={{
              border: "1px solid #d3acd7",
              borderRadius: 6,
              padding: "16px 20px",
              minHeight: 300,
              backgroundColor: "#fff",
              overflowY: "auto",
            }}
            dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
          />
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{
              ...inputStyle,
              resize: "vertical",
              minHeight: 300,
              fontFamily: "monospace",
              fontSize: "0.9rem",
            }}
            placeholder="Write your post content in Markdown..."
          />
        )}
      </div>

      {/* Cover Image */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Cover Image URL</label>
        <input
          type="url"
          value={coverImage}
          onChange={(e) => setCoverImage(e.target.value)}
          style={inputStyle}
          placeholder="https://..."
        />
        {coverImage && (
          <img
            src={coverImage}
            alt="Cover preview"
            style={{ marginTop: 8, maxHeight: 160, borderRadius: 6, objectFit: "cover", display: "block" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>

      {/* Post Images */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Post Images</label>
        {!slug ? (
          <p style={{ margin: 0, padding: "6px 0", fontSize: "0.85rem", color: "#888" }}>
            Save post first to upload images.
          </p>
        ) : (
          <>
            {imageMsg && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  marginBottom: 10,
                  fontSize: "0.85rem",
                  backgroundColor: imageMsg.isError ? "#fde8e8" : "#d1ebc1",
                  color: imageMsg.isError ? "#c0392b" : "#2d6a2d",
                  border: `1px solid ${imageMsg.isError ? "#f5c6c6" : "#a8d8a0"}`,
                }}
              >
                {imageMsg.text}
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  display: "inline-block",
                  backgroundColor: uploadLoading ? "#d5c3e9" : "#d3acd7",
                  padding: "7px 16px",
                  borderRadius: 6,
                  cursor: uploadLoading ? "not-allowed" : "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
              >
                {uploadLoading ? "Uploading..." : "Upload Images"}
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploadLoading}
                  style={{ display: "none" }}
                />
              </label>
              <span style={{ marginLeft: 10, fontSize: "0.75rem", color: "#888" }}>
                jpeg, png, gif, webp · max 5MB each
              </span>
            </div>

            {imagesLoading ? (
              <p style={{ margin: 0, padding: 0, fontSize: "0.85rem", color: "#888" }}>Loading images...</p>
            ) : postImages.length === 0 ? (
              <p style={{ margin: 0, padding: 0, fontSize: "0.85rem", color: "#888" }}>No images uploaded yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {postImages.map((img) => (
                  <div
                    key={img.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      backgroundColor: "#f5f0fb",
                      borderRadius: 8,
                      border: "1px solid #d3acd7",
                    }}
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      style={{ width: 80, height: 56, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                    />
                    <span style={{ flex: 1, fontSize: "0.82rem", wordBreak: "break-all", padding: 0 }}>
                      {img.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyMarkdown(img.name, img.url)}
                      style={{
                        background: "none",
                        border: "1px solid #d3acd7",
                        padding: "4px 10px",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: "0.78rem",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      Copy Markdown
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.name)}
                      style={{
                        background: "none",
                        border: "1px solid #e5a0a0",
                        color: "#c0392b",
                        padding: "4px 10px",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: "0.78rem",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Published */}
      <div style={fieldStyle}>
        <label
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: 0 }}
        >
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "#8c1a6a" }}
          />
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Published</span>
        </label>
        {published && (
          <div style={{ marginTop: 10 }}>
            <label style={{ ...labelStyle, fontWeight: 400, color: "#555" }}>Published At</label>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              style={{ ...inputStyle, width: "auto", minWidth: 220 }}
            />
          </div>
        )}
      </div>

      {/* Tags */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Tags</label>
        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {tags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <label
                  key={tag.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 12px",
                    border: `1px solid ${selected ? "#8c1a6a" : "#d3acd7"}`,
                    borderRadius: 20,
                    backgroundColor: selected ? "#dfd2ee" : "#fff",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleTag(tag.id)}
                    style={{ accentColor: "#8c1a6a" }}
                  />
                  {tag.name}
                </label>
              );
            })}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleCreateTag(); }
            }}
            style={{ ...inputStyle, flex: 1 }}
            placeholder="New tag name..."
          />
          <button
            type="button"
            onClick={handleCreateTag}
            style={{
              backgroundColor: "#d5c3e9",
              border: "none",
              padding: "8px 16px",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              whiteSpace: "nowrap",
              fontSize: "0.9rem",
            }}
          >
            + Add Tag
          </button>
        </div>
      </div>

      {/* Save / Cancel */}
      <div style={{ display: "flex", gap: 12, marginTop: "2rem", paddingBottom: "2rem" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ ...btnPrimary, opacity: saving ? 0.65 : 1, cursor: saving ? "not-allowed" : "pointer" }}
        >
          {saving ? "Saving..." : post ? "Save Changes" : "Create Post"}
        </button>
        <button onClick={onBack} disabled={saving} style={btnSecondary}>
          Cancel
        </button>
      </div>
    </div>
  );
}
