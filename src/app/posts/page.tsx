'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from "next/image";
import { collection, getDocs, orderBy, query, DocumentReference, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { Card, CardHeader, CardBody, CardFooter, Divider } from "@heroui/react";
import { ToastContainer, toast } from 'react-toastify';
import { Spinner } from "@heroui/react";
import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as SolidStarIcon } from '@heroicons/react/24/solid';
import { MagnifyingGlassIcon, MicrophoneIcon } from '@heroicons/react/24/outline';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import PaginationBar from '../components/PaginationBar';
import Truncate from '../components/Truncate';

type BlogPost = {
    id: string;
    title: string;
    content: string;
    imagePath: string;
    category?: DocumentReference | string;
    entryDate?: string;
    author?: Author;
};
type Author = {
    name: string;
    uid: string;
    photoURL?: string;
};

export default function Home() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);

    const searchParams = useSearchParams();
    const [totalPages, setTotalPages] = useState(1);
    const router = useRouter();
    const pathname = usePathname();
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [isCategorySet, setIsCategorySet] = useState(false);

    const search = searchParams.get('search') || '';
    const filterCategoryParam = searchParams.get('category') || '';
    const filterCategory = filterCategoryParam
        ? filterCategoryParam.split(',').map(cat => cat.trim()).filter(Boolean)
        : [];

    const page = parseInt(searchParams.get('page') || '1');

    const POSTS_PER_PAGE = 9;

    const fetchPosts = async (
        searchTerm: string = "",
        category: string[] = [],
        page: number = 1,
        limit: number = POSTS_PER_PAGE
    ) => {
        setLoading(true);
        try {
            const postsRef = collection(db, 'entry');
            const q = query(postsRef, orderBy('entryDate', 'desc'));
            const snapshot = await getDocs(q);

            const postsData: BlogPost[] = await Promise.all(
                snapshot.docs.map(async docSnap => {
                    const data = docSnap.data() as Omit<BlogPost, 'id'>;
                    let resolvedCategory = 'Other';

                    if (data.category) {
                        if ((data.category as DocumentReference).path) {
                            const catSnap = await getDoc(data.category as DocumentReference);
                            if (catSnap.exists()) {
                                const catData = catSnap.data() as { name?: string };
                                resolvedCategory = catData.name ?? 'Unknown Category';
                            }
                        } else if (typeof data.category === 'string') {
                            resolvedCategory = data.category;
                        }
                    }

                    return {
                        id: docSnap.id,
                        ...data,
                        category: resolvedCategory,
                    };
                })
            );

            // Filtering
            let filteredResults = postsData;

            if (searchTerm.trim().length > 0) {
                const lower = searchTerm.toLowerCase();
                filteredResults = filteredResults.filter(post =>
                    (post.title?.toLowerCase().includes(lower) ?? false) ||
                    (post.content?.toLowerCase().includes(lower) ?? false)
                );
            }

            if (category.length > 0) {
                filteredResults = filteredResults.filter(post =>
                    category.includes(post.category as string)
                );
            }

            // Compute total pages for filtered results
            const computedTotalPages = Math.ceil(filteredResults.length / limit) || 1;
            setTotalPages(computedTotalPages);

            // Pagination: slice for current page
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedResults = filteredResults.slice(startIndex, endIndex);

            setPosts(paginatedResults);
            return filteredResults;
        } catch (error) {
            console.error('Error fetching posts:', error);
            setPosts([]);
            setTotalPages(1);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const fetchCategoryList = async () => {
        try {
            const categorySnapshot = await getDocs(collection(db, 'categories'));
            const categories = categorySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name, ...doc.data() }));
            const categoryNames = categories.map(cat => cat.name).filter((name): name is string => typeof name === 'string');
            setAvailableCategories(categoryNames);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }

    useEffect(() => {
        fetchPosts(search, filterCategory, page, POSTS_PER_PAGE);
        fetchCategoryList();
        if (filterCategory.length > 0) {
            setIsCategorySet(true);
        } else {
            setIsCategorySet(false);
        }
    }, [search, filterCategoryParam, page]);

    const handleSearch = (term: string) => {
        term = term.trim();
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set('search', term);
        } else {
            params.delete('search');
        }
        params.set('page', '1');
        router.replace(`${pathname}?${params.toString()}`);
    };

    const handleCategoryFilter = (category: string) => {
        const params = new URLSearchParams(searchParams);
        const currentCategories = filterCategory;

        if (currentCategories.includes(category)) {
            // Remove category if already selected
            const updatedCategories = currentCategories.filter(cat => cat !== category);
            if (updatedCategories.length > 0) {
                params.set('category', updatedCategories.join(','));
            } else {
                params.delete('category');
            }
        } else {
            // Add category if not selected
            const updatedCategories = [...currentCategories, category];
            params.set('category', updatedCategories.join(','));
        }

        params.set('page', '1');
        router.replace(`${pathname}?${params.toString()}`);
    };
    const clearCategoryFilter = () => {
        const params = new URLSearchParams(searchParams);
        params.delete('category');
        params.set('page', '1');
        router.replace(`${pathname}?${params.toString()}`);
    }

    const formatDate = (entryDate?: any) => {
        if (entryDate?.seconds) {
            return new Date(entryDate.seconds * 1000).toLocaleDateString();
        }
        return 'Unknown date';
    };

    const getCategoryColor = (category?: string) => {
        switch ((category || '').toLowerCase()) {
            case 'technology':
                return 'tag-technology';
            case 'lifestyle':
                return 'tag-lifestyle';
            case 'food':
                return 'tag-food';
            case 'sports':
                return 'tag-sports';
            case 'travel':
                return 'tag-travel';
            case 'entertainment':
                return 'tag-entertainment';
            case 'health':
                return 'tag-health';
            case 'business':
                return 'tag-business';
            case 'education':
                return 'tag-education';
            case 'politics':
                return 'tag-politics';
            case 'science':
                return 'tag-science';
            case 'art':
                return 'tag-art';
            case 'music':
                return 'tag-music';
            default:
                return 'tag-other';
        }
    };

    // if (loading) {
    //     return (
    //         <div className="flex justify-center items-center h-screen">
    //             <div className="w-12 h-12 border-4 border-chocolate border-t-transparent rounded-full animate-spin" aria-label='Loading posts...' />
    //         </div>
    //     )
    // }

    // Available categories for filtering

    // const availableCategories = [
    //     'Technology', 'Lifestyle', 'Food', 'Sports', 'Travel',
    //     'Entertainment', 'Health', 'Business', 'Education', 'Politics',
    //     'Science', 'Art', 'Music', 'Other'
    // ];

    return (
        <div className="p-4 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold mb-2 text-center">Posts</h1>

            <div className="max-w-md mx-auto mb-6">
                <label htmlFor="default-search" className="sr-only">Search</label>
                <div className="relative w-full">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-500" />
                    </div>
                    <input
                        type="text"
                        id="default-search"
                        defaultValue={search}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="Search for posts..."
                        onChange={(e) => {
                            handleSearch(e.target.value);
                        }}
                        required
                    />
                    <button type="button" className="absolute inset-y-0 end-0 flex items-center pe-3">
                        <MicrophoneIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
            </div>

            {/* Category Filter Section */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Filter by Category</h2>
                <div className="flex flex-wrap gap-2">
                    {availableCategories.map(category => (
                        <button
                            key={category}
                            onClick={() => handleCategoryFilter(category)}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${filterCategory.includes(category)
                                ? getCategoryColor(category)
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                    {isCategorySet && (
                    <button
                        onClick={() => { clearCategoryFilter(); }}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-red-200 text-red-700 hover:bg-red-300"
                    >
                        Clear Filters
                    </button>
                    )}

                </div>
            </div>

            

            {loading ? (
                // <div className="py-4 px-4 text-sm text-gray-700">Loading...</div>
                <div className="flex justify-center items-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" aria-label='Loading posts...' />
                </div>
            ) : posts.length != 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {posts.map(post => (
                        <Card
                            key={post.id}
                            className="group bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 hover:-translate-y-1"
                        >
                            <Link href={`/posts/${post.id}`} className="block h-full">
                                <div className="relative overflow-hidden">
                                    <img
                                        src={post.imagePath || '/placeholder.png'}
                                        alt={post.title}
                                        width={500}
                                        height={300}
                                        className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    {/* Category badge */}
                                    <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(post.category as string)}`}>
                                        {typeof post.category === 'string' ? post.category : 'Other'}
                                    </span>
                                </div>

                                <CardBody className="p-5 flex flex-col h-[calc(100%-12rem)]">
                                    <div className="flex-grow">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors duration-300">
                                            {post.title}
                                        </h2>
                                        <p className="text-gray-600 dark:text-gray-300 line-clamp-4" dangerouslySetInnerHTML={{
                                            __html: `${post.content || ''}...`,
                                        }} />
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mr-2">
                                                {post.author?.photoURL ? (
                                                    <img
                                                        className="w-8 h-8 rounded-full object-cover"
                                                        src={post.author?.photoURL || 'https://res.cloudinary.com/dou0jhjtx/image/upload/v1750159701/Default_pfp_cznk3b.jpg'}
                                                        alt={post.author?.name || 'Anonymous'} />
                                                ) : (
                                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                        {post.author?.name ? post.author.name.charAt(0).toUpperCase() : 'A'}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {post.author?.name || 'Anonymous'}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatDate(post.entryDate)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-blue-600 dark:text-blue-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                </CardBody>
                            </Link>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="mb-6 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No posts found</h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
                        {search || filterCategory.length > 0
                            ? "Try adjusting your search or filter criteria to find what you're looking for."
                            : "There are no posts available at the moment. Check back later for new content."}
                    </p>
                    {(search || filterCategory.length > 0) && (
                        <button
                            onClick={() => {
                                const params = new URLSearchParams();
                                router.push(`${pathname}?${params.toString()}`);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                            Clear all filters
                        </button>
                    )}
                </div>
            )}

            <div className="flex justify-center items-center gap-4 mt-8">
                <PaginationBar totalPages={totalPages} currentPage={page} />
            </div>
        </div>
    );
}
