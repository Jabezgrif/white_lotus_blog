'use client';

import Link from 'next/link';
import Image from 'next/image';
import { use, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { signOut, onAuthStateChanged, User, getIdToken } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from '@headlessui/react';
import { Bars3Icon, BellIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/20/solid';
import path from 'path';



export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scrolled, setScrolled] = useState(true);
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');

  type BlogPost = {
    id: string;
    title: string;
    content: string;
    imagePath: string;
    slug: string;
    category?: string;
    entryDate?: string;
    author?: Author;
  };
  type Author = {
    name: string;
    uid: string;
  };

  const checkAdminStatus = async () => {
    if (!currentUser) return;
    try {
      const idToken = await getIdToken(currentUser, true); // Force refresh to get latest claims
      const response = await fetch('/api/check-admin', {
      
        headers: {
        
          'Authorization': `Bearer ${idToken}`,
        },
      });
      const data = await response.json();
      console.log('Admin status:', data);
      setIsAdmin(data.isAdmin);
    }
    catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };
  useEffect(() => {
    if (pathname === "/") {
      const handleScroll = () => {
        if (window.scrollY >= 200) {
          setScrolled(true);
        } else {
          setScrolled(false);
        }
      };

      handleScroll(); // run once
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    } else {
      setScrolled(true); // ✅ always dark background for non-home pages
    }
  }, [pathname]);

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    setCurrentUser(user);
    if (user) {
      try {
        console.log('User authenticated, checking admin status...');
        // Force refresh the token to get the latest claims
        const idToken = await getIdToken(user, true);
        console.log('Got ID token, checking admin status...');
        
        const response = await fetch('/api/check-admin', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Admin status response:', data);
        setIsAdmin(data.isAdmin);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
      console.log('User logged in:', user);
    } else {
      setIsAdmin(false);
      console.log('No user logged in');
    }
  });
  return () => unsubscribe();
}, []);



  // Handle clicks outside the search dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle search input changes with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      setIsLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await fetchSearchResults(searchQuery);
          setSearchResults(results);
        } catch (error) {
          console.error('Error fetching search results:', error);
          setSearchResults([]);
        } finally {
          setIsLoading(false);
        }
      }, 300); // 300ms debounce delay
    } else {
      setSearchResults([]);
      setIsLoading(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);
  // Mock search results function - replace with your actual search implementation
  const fetchSearchResults = async (searchTerm: string): Promise<any[]> => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return [];
    }
    try {
      const postsRef = collection(db, 'entry');
      const searchQueryLower = searchTerm.toLowerCase();

      // Create a query that searches in title, content, and tags
      const q = query(
        postsRef,
        orderBy('entryDate', 'desc')
      );

      const snapshot = await getDocs(q);
      const postsData: BlogPost[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<BlogPost, 'id'>),
      }));

      // Filter results on the client side for more flexible searching
      const filteredResults = postsData.filter(post => {
        // Check if title includes the search query
        if (post.title.toLowerCase().includes(searchQueryLower)) {
          return true;
        }

        // Check if content includes the search query
        if (post.content.toLowerCase().includes(searchQueryLower)) {
          return true;
        }

        // Check if any tags include the search query
        if (post.category && post.category.toLowerCase().includes(searchQueryLower)) {
          return true;
        }

        // Check if author includes the search query
        if (post.author?.name.toLowerCase().includes(searchQueryLower)) {
          return true;
        }

        return false;
      });

      const results = filteredResults.slice(0, 5); // Limit to 5 results for the dropdown
      setSearchResults(results);
      console.log('Search results:', results);
      return results;
    } catch (error) {
      console.error('Error fetching search results:', error);
      setSearchResults([]);
      return [];
    }
  };



  // This is a mock function - replace with your actual API call
  // For example: return await api.searchPosts(query);

  // Mock data for demonstration
  // return [
  //   { id: '1', title: 'Getting Started with React', slug: 'getting-started-with-react' },
  //   { id: '2', title: 'Advanced TypeScript Techniques', slug: 'advanced-typescript-techniques' },
  //   { id: '3', title: 'Building Responsive Layouts', slug: 'building-responsive-layouts' },
  //   { id: '4', title: 'State Management in Next.js', slug: 'state-management-in-nextjs' },
  //   { id: '5', title: 'Firebase Authentication Guide', slug: 'firebase-authentication-guide' },
  // ].filter(post => 
  //   post.title.toLowerCase().includes(query.toLowerCase())
  // );


  const handleLogout = () => {
    signOut(auth).then(() => {
      router.push('/');
    }).catch((error) => {
      console.error('Logout failed:', error);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/posts?search=${encodeURIComponent(searchQuery)}`);
      setIsSearchFocused(false);
    }
  };

  const handleResultClick = () => {
    setIsSearchFocused(false);
    setSearchQuery('');
  };

  return (
    <Disclosure as="nav" className={`navbar w-full z-50 fixed ${scrolled
      ? "bg-gray-800 shadow-md text-white"
      : "bg-transparent text-white"
      }`}
    >
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8 py-2">
        <div className="relative flex h-16 items-center justify-between">
          <div className="absolute inset-y-0 left-0 flex items-center sm:hidden">
            <DisclosureButton className={`relative inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white${scrolled
              ? "text-gray-400 hover:text-white"
              : "text-white"
              }`}>
              <Bars3Icon className="block h-6 w-6 ui-open:hidden" />
              <XMarkIcon className="hidden h-6 w-6 ui-open:block" />
            </DisclosureButton>
          </div>

          <div className="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/main-logo.png" alt="Logo" width={40} height={40} className="rounded-full" />
              <span className="text-white font-semibold text-lg">White Lotus Blogs</span>
            </Link>

            <div className="hidden sm:ml-6 sm:block">
              <div className="flex space-x-4">
                <Link
                  href="/"
                  className={`rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-700 ${pathname === '/' ? 'bg-gray-900 text-white' : ''} ${scrolled
                    ? "text-gray-300 hover:text-white"
                    : "text-white"
                    }`}
                >
                  Home
                </Link>

                <Link
                  href="/posts"
                  className={`rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-700 ${pathname === '/posts' ? 'bg-gray-900 text-white' : ''} ${scrolled
                    ? "text-gray-300 hover:text-white"
                    : "text-white"
                    }`}
                >
                  Posts
                </Link>
                {currentUser && (
                  <Menu as="div" className="relative">
                    {({ open }) => (
                      <>
                        <MenuButton className={`inline-flex gap-2 items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-700 ${pathname.startsWith('/manage/') ? 'bg-gray-900 text-white' : ''} ${scrolled
                          ? "text-gray-300 hover:text-white"
                          : "text-white"
                          }`}>
                          Manage
                          {open ? (
                            <ChevronUpIcon className="size-4" />
                          ) : (
                            <ChevronDownIcon className="size-4" />
                          )}
                        </MenuButton>
                        <MenuItems className="absolute z-20 mt-2 w-40 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
                          <MenuItem>
                            {({ focus }) => (
                              <Link
                                href="/manage/posts"
                                className={`block px-4 py-2 text-sm ${pathname === '/manage/posts' ? 'bg-gray-600 text-white' : ''} ${focus ? 'bg-gray-100 text-gray-600' : 'text-gray-700'}`}
                              >
                                Your Posts
                              </Link>
                            )}
                          </MenuItem>
                          <MenuItem>
                            {({ focus }) => (
                              <Link
                                href="/manage/comments"
                                className={`block px-4 py-2 text-sm ${pathname === '/manage/comments' ? 'bg-gray-600 text-white' : ''} ${focus ? 'bg-gray-100 text-gray-600' : 'text-gray-700'}`}
                              >
                                Comments
                              </Link>
                            )}
                          </MenuItem>
                        </MenuItems>
                      </>
                    )}
                  </Menu>
                )}
                {currentUser && (
                  <Link
                    href="/create"
                    className={`rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-700 ${pathname === '/create' ? 'bg-gray-900 text-white' : ''}  ${scrolled
                      ? "text-gray-300 hover:text-white"
                      : "text-white"
                      }`}
                  >
                    Create Blog
                  </Link>
                )}
                <Link
                  href="/about"
                  className={`rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-700 ${pathname === '/about' ? 'bg-gray-900 text-white' : ''} ${scrolled
                    ? "text-gray-300 hover:text-white"
                    : "text-white "
                    }`}
                >
                  About
                </Link>

                {isAdmin && (
                  <Menu as="div" className="relative">
                    {({ open }) => (
                      <>
                        <MenuButton className={`inline-flex gap-2 items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-700 ${pathname.startsWith('/manage/') ? 'bg-gray-900 text-white' : ''} ${scrolled
                          ? "text-gray-300 hover:text-white"
                          : "text-white"
                          }`}>
                          Admin
                          {open ? (
                            <ChevronUpIcon className="size-4" />
                          ) : (
                            <ChevronDownIcon className="size-4" />
                          )}
                        </MenuButton>
                        <MenuItems className="absolute z-20 mt-2 w-40 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none">
                          <MenuItem>
                            {({ focus }) => (
                              <Link
                                href="/manage/posts"
                                className={`block px-4 py-2 text-sm ${pathname === '/manage/posts' ? 'bg-gray-600 text-white' : ''} ${focus ? 'bg-gray-100 text-gray-600' : 'text-gray-700'}`}
                              >
                                Your Posts
                              </Link>
                            )}
                          </MenuItem>
                          <MenuItem>
                            {({ focus }) => (
                              <Link
                                href="/manage/comments"
                                className={`block px-4 py-2 text-sm ${pathname === '/manage/comments' ? 'bg-gray-600 text-white' : ''} ${focus ? 'bg-gray-100 text-gray-600' : 'text-gray-700'}`}
                              >
                                Comments
                              </Link>
                            )}
                          </MenuItem>
                        </MenuItems>
                      </>
                    )}
                  </Menu>
                )}
              </div>
            </div>
          </div>

          <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
            {/* Search Bar with Dropdown */}
            <div className="relative hidden md:block mr-4" ref={searchRef}>
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="sr-only">Search icon</span>
                  </div>
                  <input
                    type="text"
                    id="search-navbar"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    className="block w-full p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    placeholder="Search..."
                  />
                </div>
              </form>

              {/* Search Results Dropdown */}
              {isSearchFocused && (
                <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                  {isLoading ? (
                    <div className="py-4 px-4 text-sm text-gray-700">Loading...</div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-60 overflow-auto">
                      {searchResults.map((result) => (
                        <Link
                          key={result.id}
                          href={`/posts/${result.id}`}
                          onClick={handleResultClick}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {result.title}
                        </Link>
                      ))}
                      <div className="border-t border-gray-100">
                        <Link
                          href={`/posts?search=${encodeURIComponent(searchQuery)}`}
                          onClick={handleResultClick}
                          className="block px-4 py-2 text-sm text-blue-600 hover:bg-gray-50 font-medium"
                        >
                          View all results
                        </Link>
                      </div>
                    </div>
                  ) : searchQuery ? (
                    <div className="py-4 px-4 text-sm text-gray-700">No results found</div>
                  ) : (
                    <div className="py-4 px-4 text-sm text-gray-500">Start typing to search</div>
                  )}
                </div>
              )}
            </div>

            {/* Notifications */}
            <Menu as="div" className="relative">
              <MenuButton
                className={`relative rounded-full p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white mr-4 ${scrolled
                  ? "text-gray-400 hover:text-white"
                  : "text-white hover:bg-gray-700"
                  }`}
              >
                <span className="sr-only">View notifications</span>
                <BellIcon className="h-6 w-6" />
              </MenuButton>
              <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                <MenuItem>
                  <span className="block px-4 py-2 text-sm text-gray-700">No new notifications</span>
                </MenuItem>
              </MenuItems>
            </Menu>

            {/* Profile Menu */}
            <Menu as="div" className="relative">
              {/* <div> */}
              <MenuButton className="relative flex rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white">
                <span className="sr-only">Open user menu</span>
                <img
                  className="h-8 w-8 rounded-full"
                  src={currentUser?.photoURL || 'https://res.cloudinary.com/dou0jhjtx/image/upload/v1750159701/Default_pfp_cznk3b.jpg'}
                  alt=""
                />
              </MenuButton>
              {/* </div> */}
              <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                {currentUser ? (
                  <>
                    <MenuItem>
                      <div className="h-14 gap-2 flex flex-col justify-center px-4 py-2">
                        <p className="font-semibold text-sm text-black">Signed in as</p>
                        <p className="font-bold text-sm text-black">{currentUser?.displayName || currentUser?.email}</p>
                      </div>
                    </MenuItem>
                    <MenuItem>
                      <Link href="/manage/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Your Profile
                      </Link>
                    </MenuItem>
                    <MenuItem>
                      <Link href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Settings
                      </Link>
                    </MenuItem>
                    <MenuItem>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Sign out
                      </button>
                    </MenuItem>
                  </>
                ) : (
                  <MenuItem>
                    <Link
                      href="/auth"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Login
                    </Link>
                  </MenuItem>
                )}
              </MenuItems>
            </Menu>
          </div>
        </div>
      </div>

      <DisclosurePanel className="sm:hidden">
        <div className={`space-y-1 px-2 pt-2 pb-3 ${scrolled ? "bg-gray-800" : "bg-white"}`}>
          {/* Mobile Search Bar */}
          <div className="px-2 pt-2 pb-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                  <span className="sr-only">Search icon</span>
                </div>
                <input
                  type="text"
                  id="search-navbar-mobile"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  placeholder="Search..."
                />
              </div>

              {/* Mobile Search Results Dropdown */}
              {isSearchFocused && (
                <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                  {isLoading ? (
                    <div className="py-4 px-4 text-sm text-gray-700">Loading...</div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-60 overflow-auto">
                      {searchResults.map((result) => (
                        <Link
                          key={result.id}
                          href={`/blog/${result.slug}`}
                          onClick={handleResultClick}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          {result.title}
                        </Link>
                      ))}
                      <div className="border-t border-gray-100">
                        <Link
                          href={`/posts?search=${encodeURIComponent(searchQuery)}`}
                          onClick={handleResultClick}
                          className="block px-4 py-2 text-sm text-blue-600 hover:bg-gray-50 font-medium"
                        >
                          View all results
                        </Link>
                      </div>
                    </div>
                  ) : searchQuery ? (
                    <div className="py-4 px-4 text-sm text-gray-700">No results found</div>
                  ) : (
                    <div className="py-4 px-4 text-sm text-gray-500">Start typing to search</div>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Home */}
          <DisclosureButton
            as={Link}
            href="/"
            className={`block rounded-md px-3 py-2 text-base font-medium hover:bg-gray-700 ${pathname === '/' ? 'bg-gray-900 text-white' : ''} ${scrolled
              ? "text-gray-300 hover:text-white"
              : "text-black"
              }`}
          >
            Home
          </DisclosureButton>

          {/* Manage Dropdown */}
          {currentUser && (
            <div className="px-3">
              <Disclosure>
                {({ open }) => (
                  <>
                    <DisclosureButton className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-base font-medium hover:text-white hover:bg-gray-700 ${pathname.startsWith('/manage/') ? 'bg-gray-900 text-white' : ''} ${scrolled
                      ? "text-gray-300"
                      : "text-black"
                      }`}>
                      Manage
                      {open ? (
                        <ChevronUpIcon className="h-5 w-5 text-gray-300" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-gray-300" />
                      )}
                    </DisclosureButton>
                    <DisclosurePanel className="pl-4 pt-1 pb-2 space-y-1">
                      <Link
                        href="/manage/posts"
                        className={`block rounded-md px-3 py-2 text-sm hover:text-white hover:bg-gray-700 ${pathname === '/manage/posts' ? 'bg-gray-900 text-white' : ''} ${scrolled
                          ? "text-gray-300"
                          : "text-gray-700"
                          }`}
                      >
                        Your Posts
                      </Link>
                      <Link
                        href="/manage/comments"
                        className={`block rounded-md px-3 py-2 text-sm hover:text-white hover:bg-gray-700 ${pathname === '/manage/comments' ? 'bg-gray-900 text-white' : ''} ${scrolled
                          ? "text-gray-300"
                          : "text-gray-700"
                          }`}
                      >
                        Comments
                      </Link>
                    </DisclosurePanel>
                  </>
                )}
              </Disclosure>
            </div>
          )}
          {/* Create Blog (if logged in) */}
          {currentUser && (
            <DisclosureButton
              as={Link}
              href="/create"
              className={`block rounded-md px-3 py-2 text-base font-medium hover:text-white hover:bg-gray-700 ${pathname === '/create' ? 'bg-gray-900 text-white' : ''} ${scrolled
                ? "text-gray-300"
                : "text-black"
                }`}
            >
              Create Blog
            </DisclosureButton>
          )}
          {/* About */}
          <DisclosureButton
            as={Link}
            href="/about"
            className={`block rounded-md px-3 py-2 text-base font-medium hover:text-white hover:bg-gray-700 ${pathname === '/about' ? 'bg-gray-900 text-white' : ''} ${scrolled
              ? "text-gray-300"
              : "text-black"
              }`}
          >
            About
          </DisclosureButton>
        </div>
      </DisclosurePanel>
    </Disclosure>
  );
}
