import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/game/', '/api/'], // Disallow indexing specific game rooms or API routes
        },
        sitemap: 'https://uno-ebon.vercel.app/sitemap.xml',
    }
}