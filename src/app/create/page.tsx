'use client';

import { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp, getDocs, doc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { db } from '@/lib/firebaseConfig';
import { withAuth } from '@/lib/withAuth';
import { Field, Fieldset, Input, Label, Legend, Select, Description, Button } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import BlogEditor from '@/app/components/BlogEditor';
import { useRouter } from 'next/navigation';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Import the CSS for react-toastify
import clsx from 'clsx'

type Categories = {
    id: string;
    name: string;
}
function CreateBlog() {
  const [availableCategories, setAvailableCategories] = useState<Categories[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    fetchCategoryList();
    return onAuthStateChanged(auth, setUser);
  }, []);

  const handleUpload = async (): Promise<string | null> => {
    if (!image) return null;

    const formData = new FormData();
    formData.append('file', image);
    formData.append('upload_preset', 'unsigned_blog_upload'); // Use your preset name
    formData.append('folder', 'blog_images'); // this overrides ml_default


    const res = await fetch('https://api.cloudinary.com/v1_1/dou0jhjtx/image/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    return data.secure_url;
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to create a post');
      return;
    }

    if (!title.trim() || !category || !content.trim() || !image) {
      toast.error('All fields (Title, Category, Content, and Image) are required');
      return;
    }
    if (creating) return; // Prevent double-submit
    setCreating(true);


    try {
      const imageUrl = await toast.promise(handleUpload(), {
        pending: 'Uploading image...',
        success: 'Image uploaded successfully!',
        error: 'Image upload failed',
      });

      if (!imageUrl) return;

      await toast.promise(
        addDoc(collection(db, 'entry'), {
          title,
          content,
          category: doc(db, 'categories', category), // Store as DocumentReference
          imagePath: imageUrl,
          entryDate: serverTimestamp(),
          author: {
            uid: user.uid,
            name: user.displayName || user.email,
            photoURL: user.photoURL
          },
        }),
        {
          pending: 'Posting your blog...',
          success: 'Blog posted successfully!',
          error: 'Failed to post blog. Please try again.',
        }
      );

      // Reset form after success
      setTitle('');
      setContent('');
      setImage(null);
      setPreview(null);
      setCategory('');
      router.push('/');
    } catch (error) {
      console.error('Error posting blog:', error);
      toast.error('Something went wrong. Please try again.');
    }
    finally {
      setCreating(false);
    }
  };

  const fetchCategoryList = async () => {
    try {
      const categorySnapshot = await getDocs(collection(db, 'categories'));
      const categoriesData: Categories[] = categorySnapshot.docs.map((docSnap) => {
        const categoryData = docSnap.data() as Omit<Categories, 'id'>;
        return {
          id: docSnap.id,
          ...categoryData
        };
      });
      setAvailableCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(file);

    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  // Re-initialize editor when content state changes to reflect new content on reset
  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  }, [content]); // Dependency array for useEditor

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Create Post</h1>
      {/* Wrap the Fieldset and Button in an actual <form> tag */}
      <form onSubmit={handleSubmit}>
        <Fieldset className="space-y-6 rounded-xl bg-white/5 p-6 sm:p-10">
          <Legend className="text-base/7 font-semibold text-black">Post Details</Legend>
          <Field>
            <Label className="text-sm/6 font-medium text-black">Post Title</Label>
            <Input
              required
              className={clsx(
                'mt-3 block w-full rounded-lg border border-gray-300 bg-white',
                'px-3 py-2 text-sm sm:py-1.5 sm:text-base',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              )}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder='Title'
            />
          </Field>
          <Field>
            <Label className="text-sm/6 font-medium text-black">Category</Label>
            <div className="relative">
              <Select
                required
                className={clsx(
                  'mt-3 block w-full appearance-none rounded-lg border border-gray-300 bg-white',
                  'px-3 py-2 text-sm sm:py-1.5 sm:text-base',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                )}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {/* Added a default disabled option for better UX */}
                <option value="" disabled>Select a category</option>
                {availableCategories && availableCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
                {/* Fallback options in case categories fail to load */}
                {/* <option >Technology</option>
                <option>Food</option>
                <option>Lifestyle</option>
                <option>Sports</option>
                <option>Travel</option>
                <option>Entertainment</option>
                <option>Health</option>
                <option>Business</option>
                <option>Education</option>
                <option>Politics</option>
                <option>Science</option>
                <option>Art</option>
                <option>Music</option>
                <option>Other</option> */}
              </Select>
              <ChevronDownIcon
                className="group pointer-events-none absolute top-2.5 right-2.5 size-4 fill-black/60"
                aria-hidden="true"
              />
            </div>
          </Field>
          <Field>
            <Label className="text-sm/6 font-medium text-black">Blog Content</Label>
            <Description className="text-sm/6 text-gray-500">
              Say what's on your mind.
            </Description>
            <div
              className={clsx(
                'mt-3 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-black',
                'leading-relaxed font-medium min-h-[200px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2'
              )}
            >
              <BlogEditor content={content} onChange={setContent} />
            </div>
          </Field>
          <Field>
            <Label className="text-sm/6 font-medium text-black">Blog Image</Label>
            <Input
              required
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                         file:rounded-lg file:border-0
                         file:text-sm file:font-semibold
                         file:bg-blue-50 file:text-blue-700
                         hover:file:bg-blue-100 focus:outline-none mb-6"
            />
            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="mb-6 max-h-64 w-auto rounded-lg border border-gray-300 object-contain"
              />
            )}
          </Field>
          {/* Submit Button - now within the <form> */}
          <Button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm sm:py-2 sm:text-base text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create Post'}
          </Button>
        </Fieldset>
      </form>
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored" />
    </div>
  );
}
export default withAuth(CreateBlog);