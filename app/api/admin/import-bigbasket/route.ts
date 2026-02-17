
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
        const pageProps = nextData.props?.pageProps;

        const importedProducts: any[] = [];

        // Helper to extract fields from a product object
        const extractFields = (item: any, pd?: any) => {
            const name = item.p_desc || item.name || item.desc || item.title;
            const description = item.desc || pd?.about_the_product || item.description || name || '';

            let price = item.sp || item.mrp || item.price || item.pricing?.discount?.mrp;
            if (!price && item.pricing?.discount?.prim_price?.sp) {
                price = item.pricing.discount.prim_price.sp;
            } else if (!price && item.pricing?.discount?.mrp) {
                price = item.pricing.discount.mrp;
            }

            const image = item.images?.[0]?.l || item.images?.[0]?.s || item.image_url;

            // Extract category - prioritize mlc_name (Middle Level Category) for Fruit/Veg split
            // fallbacks: tlc_name, category_name
            const category = item.category?.mlc_name || item.category?.tlc_name || item.category_name || pd?.category?.mlc_name || pd?.category?.tlc_name || '';

            return { name, description, price, image, category };
        };

        // Aggressive recursive search for products
        const seenObjects = new Set();
        const findProductsInObj = (obj: any): any[] => {
            if (!obj || typeof obj !== 'object' || seenObjects.has(obj)) return [];
            seenObjects.add(obj);

            let found: any[] = [];

            if (Array.isArray(obj)) {
                // Check if this array contains product-like items
                if (obj.length > 0 && (obj[0].sku || obj[0].p_desc || obj[0].product_id)) {
                    found = [...found, ...obj];
                }
                // Continue searching inside array items
                for (const item of obj) {
                    found = [...found, ...findProductsInObj(item)];
                }
            } else {
                // If it's an object, check its keys
                for (const key in obj) {
                    if (key === 'products' && Array.isArray(obj[key])) {
                        found = [...found, ...obj[key]];
                    }
                    found = [...found, ...findProductsInObj(obj[key])];
                }
            }
            return found;
        };

        const rawItems = findProductsInObj(pageProps || nextData);

        // Use a map to deduplicate by name
        const uniqueProducts = new Map();

        // Single product fallback if recursive search missed it
        if (pageProps?.productDetails) {
            const pd = pageProps.productDetails;
            let item = pd.product || pd.product_details?.product;
            if (!item && pd.children?.[0]) item = pd.children[0];
            if (item) {
                const fields = extractFields(item, pd);
                if (fields.name && fields.price !== undefined) {
                    uniqueProducts.set(fields.name, { ...fields, stock: 100 });
                }
            }
        }

        for (const item of rawItems) {
            const fields = extractFields(item);
            if (fields.name && fields.price !== undefined) {
                if (!uniqueProducts.has(fields.name)) {
                    uniqueProducts.set(fields.name, { ...fields, stock: 100 });
                }
            }
        }

        const toImport = Array.from(uniqueProducts.values());

        if (toImport.length === 0) {
            return NextResponse.json({ error: 'No products found on the page' }, { status: 422 });
        }

        // Insert products into database
        const savedProducts = [];
        for (const p of toImport) {
            const existing = await db.select().from(products).where(eq(products.name, p.name)).limit(1);
            if (existing.length === 0) {
                try {
                    const [saved] = await db.insert(products).values(p).returning();
                    savedProducts.push(saved);
                } catch (e) {
                    console.error(`Failed to insert product ${p.name}:`, e);
                }
            }
        }

        return NextResponse.json({
            message: `Successfully processed ${toImport.length} products. Imported ${savedProducts.length} new ones.`,
            count: savedProducts.length,
            totalFound: toImport.length,
            products: savedProducts
        });

    } catch (error: any) {
        console.error('Import error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
