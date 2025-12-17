import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'UNO Online',
        short_name: 'UNO',
        description: 'Play UNO Online with friends',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#C80000',
        icons: [
            {
                src: '/favicon.ico',
                sizes: 'any',
                type: 'image/x-icon',
            },
            // ideally you should add 192x192 and 512x512 png icons here later
        ],
    }
}