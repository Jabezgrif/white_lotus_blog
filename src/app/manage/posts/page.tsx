'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebaseConfig';
import { collection, query, where, onSnapshot, deleteDoc, doc, getDocs, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { withAuth } from '@/lib/withAuth';
import ConfirmModal from "@/app/components/ConfirmModal";
import { extractPublicId } from 'cloudinary-build-url'
import { ToastContainer, toast } from 'react-toastify';
import Link from 'next/link';

function ManagePosts() {
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showDelModal, setShowDelModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState<any>(null);
  const [publicID, setPublicID] = useState('');
  const [deleting, setDeleting] = useState(false)



  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const q = query(
          collection(db, 'entry'),
          where('author.uid', '==', user.uid)
        );
        const unsubscribeSnap = onSnapshot(q, (snap) => {
          setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return () => unsubscribeSnap();
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
  if (posts.length > 0) {
    const fetchCategories = async () => {
      const updatedPosts = await Promise.all(
        posts.map(async (post) => {
          if (post.category && typeof post.category !== "string") {
            const catSnap = await getDoc(post.category);
            return {
              ...post,
              categoryName: catSnap.exists() ? (catSnap.data() as { name?: string }).name ?? "Unknown" : "Unknown",
            };
          }
          return {
            ...post,
            categoryName: post.category || "Uncategorized",
          };
        })
      );
      setPosts(updatedPosts);
    };

    fetchCategories();
  }
}, [posts.length]);

  const onDeleteClick = (post: any) => {
    setPostToDelete(post);
    setShowDelModal(true);
  };

  const handleConfirm = async () => {
    if (!postToDelete) return;

    const pubId = extractPublicId(postToDelete.imagePath);
    const postId = postToDelete.id;

    try {
      setDeleting(true);
      // 1. Delete image from Cloudinary
      await toast.promise(
        fetch('/api/cloudinary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: pubId }),
        }).then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to delete image from Cloudinary');
          }
          return res.json();
        }),
        {
          pending: 'Deleting image from Cloudinary...',
          success: 'Image deleted successfully!',
          error: 'Failed to delete image.',
        }
      );

      // 2. Delete comments subcollection
      const commentsRef = collection(db, 'entry', postId, 'comments');
      const commentsSnap = await getDocs(commentsRef);

      const deletePromises = commentsSnap.docs.map((docSnap) => deleteDoc(docSnap.ref));
      await toast.promise(
        Promise.all(deletePromises),
        {
          pending: 'Deleting comments...',
          success: 'Comments deleted!',
          error: 'Failed to delete comments.',
        }
      );

      // 3. Delete post document
      await toast.promise(
        deleteDoc(doc(db, 'entry', postId)),
        {
          pending: 'Deleting post from Firestore...',
          success: 'Post deleted successfully!',
          error: 'Failed to delete post.',
        }
      );

      setShowDelModal(false);
      setPostToDelete(null);

    } catch (err: any) {
      console.error('Deletion failed:', err);
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setDeleting(false);
    }
  };



  if (!currentUser) {
    return <div className="text-center mt-20">Please log in to manage your posts.</div>;
  }
else{
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Your Blog Posts</h1>

      {posts.length === 0 ? (
        <p className="text-center text-gray-600">You haven’t posted anything yet.</p>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="p-4 border rounded-md bg-white shadow">
              <h2 className="text-xl font-semibold">{post.title}</h2>
              <p className="text-sm text-gray-500 mb-2">
                Category: <span className="font-medium">{post.categoryName}</span>
              </p>
              <Link
                href={`/posts/edit/${post.id}`}
                className="bg-sky-500 hover:bg-sky-700 inline-block px-4 py-2 rounded text-white"
              >
                Edit
              </Link>
              <button
                onClick={() => onDeleteClick(post)}
                className="bg-red-500 hover:bg-red-700 inline-block px-4 py-2 rounded text-white ml-2"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={showDelModal}
        message="This action cannot be undone."
        onCancel={() => {
          setShowDelModal(false);
          setPostToDelete(null);
        }}
        onConfirm={handleConfirm}
        deleting={deleting}
        title='Are you sure you want to delete this post?'
      />
    </div>
  );
}
}

export default withAuth(ManagePosts);
