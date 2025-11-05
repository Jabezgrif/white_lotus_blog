import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function POST(req: Request) {
  // Verify Content-Type
  const contentType = req.headers.get('content-type');
  if (contentType !== 'application/json') {
    return NextResponse.json(
      { error: 'Invalid content type' },
      { status: 400 }
    );
  }

  try {
    const { publicId } = await req.json();
    
    if (!publicId) {
      return NextResponse.json(
        { error: 'publicId is required' },
        { status: 400 }
      );
    }

    const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Cloudinary error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete image',
        details: error.message 
      },
      { status: 500 }
    );
  }
}