import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/game/*", "/private/"],
        },
        sitemap: "https://uno-ebon.vercel.app/sitemap.xml",
    };
}