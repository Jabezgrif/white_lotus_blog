'use client';

import { use } from 'react';
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  DocumentReference,
} from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { useEffect, useState } from 'react';
import { User, onAuthStateChanged, getAuth } from 'firebase/auth';
import Link from 'next/link';
import DOMPurify from 'dompurify';

type BlogData = {
  title?: string;
  content?: string;
  imagePath?: string;
  author?: {
    name?: string;
    uid?: string;
    photoURL?: string;
  };
  entryDate?: any;
  lastUpdatedAt?: any;
  category?: DocumentReference | string; // this allows either
};

export default function BlogDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [blog, setBlog] = useState<BlogData | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [categoryName, setCategoryName] = useState<string>('Other');

  const safeHtml = blog?.content ? DOMPurify.sanitize(blog.content) : '';

  // Subscribe to auth
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // Fetch blog + category
  useEffect(() => {
    const fetchBlogAndCategory = async () => {
      try {
        const snap = await getDoc(doc(db, 'entry', id));
        if (!snap.exists()) {
          console.warn('No blog found for id:', id);
          return;
        }
        const data = snap.data() as BlogData;
        setBlog(data);

        console.log('Blog data:', data);

        if (data.category) {
          // If it's a DocumentReference
          if ((data.category as DocumentReference).path && typeof (data.category as DocumentReference).path === 'string') {
            // It's likely a DocumentReference
            try {
              const categoryRef = data.category as DocumentReference;
              const catSnap = await getDoc(categoryRef);
              if (catSnap.exists()) {
                const catData = catSnap.data() as { name?: string };
                setCategoryName(catData.name ?? 'Unknown Category');
              } else {
                console.warn('Referenced category doc does not exist:', categoryRef.path);
                setCategoryName('Unknown Category');
              }
            } catch (err) {
              console.error('Error fetching category reference:', err);
              setCategoryName('Unknown Category');
            }
          } else if (typeof data.category === 'string') {
            // Category was stored as a string
            setCategoryName(data.category);
          } else {
            console.warn('Category field has unexpected type:', data.category);
            setCategoryName('Other');
          }
        } else {
          console.log('No category field set in blog doc');
          setCategoryName('Other');
        }

      } catch (err) {
        console.error('Error fetching blog:', err);
      }
    };

    fetchBlogAndCategory();
  }, [id]);

  // Comments
  useEffect(() => {
    const q = query(
      collection(db, 'entry', id, 'comments'),
      orderBy('commentDate', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [id]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) {
      return; // or redirect to login
    }
    try {
      await addDoc(collection(db, 'entry', id, 'comments'), {
        content: newComment.trim(),
        author: {
          name: user.displayName,
          uid: user.uid,
        },
        commentDate: Timestamp.now(),
      });
      setNewComment('');
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  };

  const getCategoryColor = (givenCategory?: string) => {
    switch ((givenCategory || '').toLowerCase()) {
      case 'technology': return 'tag-technology';
      case 'lifestyle': return 'tag-lifestyle';
      case 'food': return 'tag-food';
      case 'sports': return 'tag-sports';
      case 'travel': return 'tag-travel';
      case 'entertainment': return 'tag-entertainment';
      case 'health': return 'tag-health';
      case 'business': return 'tag-business';
      case 'education': return 'tag-education';
      case 'politics': return 'tag-politics';
      case 'science': return 'tag-science';
      case 'art': return 'tag-art';
      case 'music': return 'tag-music';
      default: return 'tag-other';
    }
  };

  const formatDate = (entryDate?: any) => {
    if (entryDate?.seconds) {
      return new Date(entryDate.seconds * 1000).toLocaleDateString();
    }
    return 'Unknown date';
  };

  if (!blog) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-2">{blog.title}</h1>
      <div className="text-center mb-3">
        <span
          className={`inline-block px-3 py-1 rounded-full text-white text-xs ${getCategoryColor(categoryName)}`}
        >
          {categoryName}
        </span>
      </div>
      <div className="flex justify-center items-center flex-wrap gap-2 mb-4 text-sm text-gray-600">
        {blog.author?.name && (
          <div className="flex items-center gap-2">
            {blog.author.photoURL && (
              <img
                src={blog.author.photoURL}
                alt={blog.author.name}
                className="w-6 h-6 rounded-full"
              />
            )}
            <span>By <strong>{blog.author.name}</strong></span>
          </div>
        )}

        {blog.entryDate && (
          <span className="before:content-['•'] before:mx-2">
            Created: {formatDate(blog.entryDate)}
          </span>
        )}

        {blog.lastUpdatedAt && (
          <span className="before:content-['•'] before:mx-2">
            Updated: {formatDate(blog.lastUpdatedAt)}
          </span>
        )}
      </div>

      {blog.imagePath && (
        <img src={blog.imagePath} alt="Blog Cover" className="w-full h-80 object-cover rounded-lg mb-6" />
      )}

      <div
        className="prose max-w-none prose-lg text-black"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />

      {/* Comments Section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Comments</h2>

        {user ? (
          <form onSubmit={handleCommentSubmit} className="mb-6">
            <textarea
              className="w-full p-3 border border-gray-300 rounded mb-2"
              rows={4}
              placeholder="Write your comment here..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Post Comment
            </button>
          </form>
        ) : (
          <p className="mb-6 text-sm text-gray-600">
            <span>Please </span>
            <Link href="/auth" className="text-blue-600 underline">
              log in
            </Link>
            <span> to post a comment.</span>
          </p>
        )}

        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="border-t pt-3">
                <p className="text-sm font-semibold">{comment.author?.name}</p>
                <p className="text-gray-800">{comment.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No comments yet.</p>
        )}
      </div>
    </div>
  );
}
