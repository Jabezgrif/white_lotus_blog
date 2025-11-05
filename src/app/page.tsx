'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import Link from 'next/link';
import { Parallax, ParallaxBanner } from 'react-scroll-parallax';

import { DocumentReference } from 'firebase/firestore';

type BlogPost = {
  id: string;
  title: string;
  content: string;
  imagePath: string;
  category?: string | DocumentReference; // ✅ Firestore reference or plain string
  entryDate?: any;
  author?: Author;
};

type Category = {
  id: string;
  name: string;
  background?: {
    type: string;
    direction: string;
    colors: string[];
  };
  textColor: string;
};


type Author = {
  name: string;
  uid: string;
};

export default function BlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryColors, setCategoryColors] = useState<{ [key: string]: any }>({});

  const fetchCategoryData = async (categoryRef: DocumentReference): Promise<string> => {
    try {
      const categorySnapshot = await getDoc(categoryRef);
      if (categorySnapshot.exists()) {
        const categoryData = categorySnapshot.data() as Category;
        console.log('Fetched category data:', categoryData);
        return categoryData.name;
      }
      return 'Unknown Category';
    } catch (error) {
      console.error('Error fetching category:', error);
      return 'Unknown Category';
    }
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'entry'));
        const postsPromises = snapshot.docs.map(async (docSnap) => {
          const postData = docSnap.data() as Omit<BlogPost, 'id'>;
          let categoryName = 'Other';

          if (postData.category && typeof postData.category === 'object') {
            // ✅ Category is a Firestore DocumentReference
            categoryName = await fetchCategoryData(postData.category as DocumentReference);
          } else if (typeof postData.category === 'string') {
            categoryName = postData.category;
          }

          return {
            id: docSnap.id,
            ...postData,
            category: categoryName,
          };
        });

        const postsData = await Promise.all(postsPromises);
        setPosts(postsData);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchCategoryColors = async () => {
      const categoryCollection = collection(db, 'categories');
      const categoriesSnapshot = await getDocs(categoryCollection);
      const colorsMap: { [key: string]: any } = {};
      categoriesSnapshot.forEach((doc) => {
        colorsMap[doc.data().name.toLowerCase()] = {
          background: doc.data().background,
          textColor: doc.data().textColor,
        }
      });
      setCategoryColors(colorsMap);
    };

    fetchPosts();
    fetchCategoryColors();
  }, []);


  // const formatDate = (entryDate?: any) => {
  //   if (entryDate?.seconds) {
  //     return new Date(entryDate.seconds * 1000).toLocaleDateString();
  //   }
  //   return 'Unknown date';
  // };

  const formatDate = (dateInput?: any) => {
    if (!dateInput) return 'Unknown date';

    // Handle Firebase timestamp format
    const date = dateInput.seconds
      ? new Date(dateInput.seconds * 1000)
      : new Date(dateInput);

    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid date';

    // Arrays for day and month names
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Get the day of the week, month, date, and year
    const dayOfWeek = days[date.getDay()];
    const month = months[date.getMonth()];
    const dayOfMonth = date.getDate();
    const year = date.getFullYear();

    // Format the date string
    return `${dayOfWeek}, ${month} ${dayOfMonth}, ${year}`;
  };

  const getCategoryColor = (categoryName?: string) => {
    // switch ((category || '').toLowerCase()) {
    //   case 'technology':
    //     return 'tag-technology';
    //   case 'lifestyle':
    //     return 'tag-lifestyle';
    //   case 'food':
    //     return 'tag-food';
    //   case 'sports':
    //     return 'tag-sports';
    //   case 'travel':
    //     return 'tag-travel';
    //   case 'entertainment':
    //     return 'tag-entertainment';
    //   case 'health':
    //     return 'tag-health';
    //   case 'business':
    //     return 'tag-business';
    //   case 'education':
    //     return 'tag-education';
    //   case 'politics':
    //     return 'tag-politics';
    //   case 'science':
    //     return 'tag-science';
    //   case 'art':
    //     return 'tag-art';
    //   case 'music':
    //     return 'tag-music';
    //   default:
    //     return 'tag-other';
    // }

    if (!categoryName) return {};

    const normalizedCategory = categoryName.toLowerCase();
    const colorData = categoryColors[normalizedCategory];

    if (!colorData) return {};

    // Construct a style object for direct use in the element's style prop
    const background = colorData.background.type === 'linear-gradient'
      ? `${colorData.background.type}(${colorData.background.direction}, ${colorData.background.colors.join(', ')})`
      : colorData.background;
    console.log('Category color data:', { background, textColor: colorData.textColor });
    return {
      background: background,
      color: colorData.textColor,
    };
  };

  // if (loading) {
  //   return (
  //     <div className="flex justify-center items-center h-[60vh]">
  //       <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
  //     </div>
  //   );
  // }

  return (
    <>
      {/* ✅ Full-width hero section */}


      {/* ✅ Hero section with layered parallax */}
      <ParallaxBanner
        layers={[
          {
            image: "/images/hero-img.png",
            speed: -20,
            expanded: false, // Prevents image expansion
            scale: [1, 1.3], // Controls the scaling effect
            opacity: [1, 0.8], // Adds subtle fade effect
          },
          {
            speed: -10,
            children: (
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-transparent" />
            ),
          },
          {
            speed: -5,
            children: (
              <section className="relative h-screen flex flex-col items-center justify-center text-center text-white px-6">
                <h2 className="font-heading text-5xl sm:text-6xl lg:text-8xl font-thin drop-shadow-lg">
                  About self love & Relationships
                </h2>
                <p className="text-lg sm:text-2xl lg:text-3xl max-w-3xl mt-6 drop-shadow-md">
                  Hi, I'm a Fitness enthusiast eager to share everything that I learned
                  through my 5 year transformation
                </p>
              </section>
            ),
          },
        ]}
        className="h-screen w-full"
        style={{
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />






      <div className="relative z-20 bg-white">
        {/* ✅ Constrained blog content */}
        <div className="container p-4 mx-auto mt-6" id='blog-card'>

          {loading ? (
            <div className="flex justify-center items-center h-[60vh]">
              <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {posts.map(post => (
                <Link key={post.id} href={`/posts/${post.id}`}>
                  <div className="border rounded-xl overflow-hidden shadow hover:shadow-md transition cursor-pointer bg-white image-zoom">
                    <img
                      src={post.imagePath}
                      alt={post.title || 'Blog image'}
                      className="w-full h-60 object-cover"
                    />
                    <div className="p-4 space-y-2">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium tag`}
                        style={getCategoryColor(
                          typeof post.category === 'string' ? post.category : undefined
                        )}
                      >
                        {typeof post.category === 'string' ? post.category : 'Other'}
                      </span>
                      <h2 className="text-xl font-semibold hover:text-gray-500">{post.title}</h2>
                      <div
                        className="text-sm text-gray-700"
                        dangerouslySetInnerHTML={{
                          __html: `${post.content?.slice(0, 100) || ''}...`,
                        }}
                      />
                    </div>
                    <div className="px-4 pb-4 text-sm text-gray-500">
                      <p>
                        By {post.author?.name || 'Unknown'} &middot; {formatDate(post.entryDate)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}