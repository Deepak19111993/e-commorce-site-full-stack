
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();
        const userRole = req.headers.get('x-user-role');
        const userId = req.headers.get('x-user-id');

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Auth check - Only admins can import
        if (userRole !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch BigBasket page
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch BigBasket page' }, { status: 500 });
        }

        const html = await response.text();

        // Extract __NEXT_DATA__
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);

        if (!nextDataMatch) {
            console.error('Extraction failed: __NEXT_DATA__ not found');
            return NextResponse.json({ error: 'Could not find product data (NEXT_DATA missing)' }, { status: 422 });
        }

        const nextData = JSON.parse(nextDataMatch[1]);
        const pd = nextData.props?.pageProps?.productDetails;
        let productData = pd?.product || pd?.product_details?.product;

        // Handle alternative structure where product is in children
        if (!productData && pd?.children?.[0]) {
            productData = pd.children[0];
        }

        if (!productData) {
            console.error('Extraction failed: Product details not found in NEXT_DATA');
            return NextResponse.json({ error: 'Product details not found in page data' }, { status: 422 });
        }

        // Extract relevant fields with fallback paths
        const name = productData.p_desc || productData.name || productData.desc || productData.title;
        const description = productData.desc || pd?.about_the_product || productData.description || '';

        // Price extraction (handling nested pricing object)
        let price = productData.sp || productData.mrp || productData.price;
        if (!price && productData.pricing?.discount?.prim_price?.sp) {
            price = productData.pricing.discount.prim_price.sp;
        } else if (!price && productData.pricing?.discount?.mrp) {
            price = productData.pricing.discount.mrp;
        }

        const imageUrl = productData.images?.[0]?.l || productData.images?.[0]?.s || productData.image_url;

        console.log('Extracted Data:', { name, price, imageUrl });

        if (!name || price === undefined) {
            return NextResponse.json({ error: 'Missing core product details (name or price)' }, { status: 422 });
        }

        // Insert into database
        const [newProduct] = await db.insert(products).values({
            name,
            description,
            price: String(price),
            stock: 100, // Default stock
            image: imageUrl,
        }).returning();

        return NextResponse.json(newProduct);

    } catch (error: any) {
        console.error('Import error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
