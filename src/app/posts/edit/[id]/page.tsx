'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
    collection,
    getDocs,
    DocumentReference
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '@/lib/firebaseConfig';
import { withAuth } from '@/lib/withAuth';
import { Field, Fieldset, Input, Label, Legend, Description, Button, Select } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { ToastContainer, toast } from 'react-toastify';
import BlogEditor from '@/app/components/BlogEditor';
import clsx from 'clsx';
import 'react-toastify/dist/ReactToastify.css';

type Categories = {
    id: string;
    name: string;
}
function EditBlog({ user }: { user: User }) {
    const { id } = useParams();
    const router = useRouter();
    const [availableCategories, setAvailableCategories] = useState<Categories[]>([]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [category, setCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // const cloudinary = require('cloudinary').v2;
    useEffect(() => {
        const loadPost = async () => {
            try {
                const docRef = doc(db, 'entry', id as string);
                const snap = await getDoc(docRef);
                if (!snap.exists()) {
                    toast.error('Post not found');
                    return router.push('/');
                }

                const data = snap.data();
                if (data.author?.uid !== user.uid) {
                    toast.error("You can't edit someone else's post.");
                    return router.push('/');
                }

                if (data.category) {
                    if ((data.category as DocumentReference).id) {
                        setCategory((data.category as DocumentReference).id); // store just the ID for Select
                    } else if (typeof data.category === 'string') {
                        // fallback if you had old posts stored as plain strings
                        setCategory(data.category);
                    }
                }

                setTitle(data.title || '');
                setContent(data.content || '');
                setPreview(data.imagePath || '');
                // setCategory(data.category || '');
            } catch (error) {
                console.error(error);
                toast.error('Failed to load post');
            } finally {
                setLoading(false);
            }
        };

        loadPost();
        fetchCategoryList();
    }, [id, user.uid, router]);

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

    const handleUpload = async (): Promise<string | null> => {
        if (!image) return preview || null; // Use existing image if not changed

        const formData = new FormData();
        formData.append('file', image);
        formData.append('upload_preset', 'unsigned_blog_upload');
        formData.append('folder', 'blog_images');

        const res = await fetch('https://api.cloudinary.com/v1_1/dou0jhjtx/image/upload', {
            method: 'POST',
            body: formData,
        });

        const data = await res.json();
        return data.secure_url || null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !category || !content.trim()) {
            toast.error('All fields are required');
            return;
        }

        setSaving(true);

        try {
            const imageUrl = await toast.promise(handleUpload(), {
                pending: 'Uploading image...',
                success: 'Image uploaded',
                error: 'Image upload failed',
            });

            if (!imageUrl) return;

            const docRef = doc(db, 'entry', id as string);
            await toast.promise(
                updateDoc(docRef, {
                    title,
                    content,
                    category: doc(db, 'categories', category), // Store as DocumentReference
                    imagePath: imageUrl,
                    lastUpdatedAt: serverTimestamp(),
                }),
                {
                    pending: 'Updating post...',
                    success: 'Blog updated successfully!',
                    error: 'Failed to update post',
                }
            );

            router.push(`/posts/${id}`);
        } catch (error) {
            console.error(error);
            toast.error('Unexpected error. Please try again.');
        } finally {
            setSaving(false);
        }
    };


    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setImage(file);
        if (file) setPreview(URL.createObjectURL(file));
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="w-10 h-10 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-center">Edit Post</h1>

            <form onSubmit={handleSubmit}>
                <Fieldset className="space-y-6 rounded-xl bg-white/5 p-6 sm:p-10">
                    <Legend className="text-base/7 font-semibold text-black">Post Details</Legend>

                    <Field>
                        <Label className="text-sm font-medium text-black">Post Title</Label>
                        <Input
                            required
                            className="mt-3 block w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Title"
                        />
                    </Field>

                    <Field>
                        <Label className="text-sm font-medium text-black">Category</Label>
                        <div className="relative">
                            <Select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                required
                                className={clsx(
                                    'mt-3 block w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm/6 text-black',
                                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                                    '*:text-black'
                                )}
                            >
                                <option value="" disabled>Select a category</option>
                                {availableCategories && availableCategories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                                {/* <option>Technology</option>
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
                        <Label className="text-sm font-medium text-black">Blog Content</Label>
                        <Description className="text-sm text-gray-500">Say what's on your mind.</Description>
                        <div className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 min-h-[200px]">
                            <BlogEditor content={content} onChange={setContent} />
                        </div>
                    </Field>

                    <Field>
                        <Label className="text-sm font-medium text-black">Blog Image</Label>
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus:outline-none"
                        />
                        {preview && (
                            <img
                                src={preview}
                                alt="Preview"
                                className="mt-4 max-h-64 w-auto rounded-lg border border-gray-300 object-contain"
                            />
                        )}
                    </Field>

                    <Button
                        type="submit"
                        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        disabled={saving}
                    >
                        {saving ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg
                                    className="animate-spin h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                    />
                                </svg>
                                Saving...
                            </span>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>

                </Fieldset>
            </form>

            <ToastContainer position="bottom-right" autoClose={3000} theme="colored" />
        </div>
    );
}

export default withAuth(EditBlog);
