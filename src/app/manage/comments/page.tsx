'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebaseConfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { withAuth } from '@/lib/withAuth';
import ConfirmModal from "@/app/components/ConfirmModal";
import { toast } from 'react-toastify';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel
} from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

function ManageComments() {
  const [postsWithComments, setPostsWithComments] = useState<any[]>([]);
  const [showDelModal, setShowDelModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        setLoading(true);
      if (user) {
        setCurrentUser(user);
        const q = query(collection(db, 'entry'), where('author.uid', '==', user.uid));

        const unsubscribeSnap = onSnapshot(q, async (snap) => {
          const posts = await Promise.all(
            snap.docs.map(async (docSnap) => {
              const postData = { id: docSnap.id, ...docSnap.data() };
              const commentsSnap = await getDocs(collection(db, 'entry', docSnap.id, 'comments'));
              const comments = commentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              return comments.length > 0 ? { ...postData, comments } : null;
            })
          );

          setPostsWithComments(posts.filter(Boolean));
          setLoading(false);
        });

        return () => unsubscribeSnap();
      }else {
        setLoading(false);
      }
     
    });

    return () => unsubscribeAuth();
  }, []);

  const onDeleteClick = (comment: any) => {
    setCommentToDelete(comment);

    setShowDelModal(true);
  };

  const handleConfirm = async () => {
    if (!commentToDelete) return;


    const postId = commentToDelete.postId;
    const commentId = commentToDelete.id;

    try {
      setDeleting(true);
      // 1. Delete comment from Firestore
      await toast.promise(
        deleteDoc(doc(db, 'entry', postId, 'comments', commentId)),
        {
          pending: 'Deleting comment...',
          success: 'Comment deleted successfully',
          error: 'Failed to delete comment'
        }
      );
      setShowDelModal(false);
      setCommentToDelete(null);
    }
    catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }

    finally {
      setDeleting(false);
    }
  };

  if (!currentUser) {
    return <div className="text-center mt-20 text-lg">Please log in to manage comments.</div>;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
      </div>
    );
  }


  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-6">Manage Comments</h1>

      {postsWithComments.length === 0 ? (
        <p className="text-center text-gray-500">No comments found on your posts.</p>
      ) : (
        <div className="space-y-4 bg-white shadow-md p-4 rounded-xl">
          {postsWithComments.map((post) => (
            <Disclosure key={post.id}>
              <DisclosureButton className="flex justify-between items-center w-full px-4 py-3 text-left font-medium text-gray-800 hover:bg-gray-50 rounded-lg">
                <span>{post.title}</span>
                <div className="flex items-center gap-2">
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                    {post.comments.length} comments
                  </span>
                  <ChevronDownIcon className="w-5 h-5 text-gray-500 transition-transform group-data-open:rotate-180" />
                </div>
              </DisclosureButton>

              <DisclosurePanel className="px-4 pb-4">
                <div className="space-y-4">
                  {post.comments.map((comment: any) => (
                    <div key={comment.id} className="bg-sky-50 border rounded-lg p-4 shadow-sm flex items-center justify-between">
                      <p className="text-sm text-gray-700">
                        <strong>{comment.author?.name || 'Anonymous'}:</strong> {comment.content}
                      </p>

                      <button
                        onClick={() => onDeleteClick({ postId: post.id, ...comment })}
                        className="text-sm bg-red-500 hover:bg-red-700 rounded text-white px-3 py-1"
                        disabled={deleting}
                      >
                        {deleting ? "Deleting..." : "Delete"}
                      </button>

                    </div>
                  ))}
                </div>
              </DisclosurePanel>
            </Disclosure>
          ))}
        </div>
      )}

      <ConfirmModal
        open={showDelModal}
        title="Are you sure you want to delete this comment?"
        message="This action cannot be undone."
        onCancel={() => {
          setShowDelModal(false);
          setCommentToDelete(null);
        }}
        onConfirm={handleConfirm}
        deleting={deleting}
      />
    </div>
  );
}

export default withAuth(ManageComments);
