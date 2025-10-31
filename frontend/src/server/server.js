// server/server.js
import express from 'express'
import { createServer as createViteServer } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import compression from 'compression'
import helmet from 'helmet'
import cors from 'cors'
import BlockchainService from './blockchain-service.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'
const port = process.env.PORT || 5173
const host = process.env.HOST || '0.0.0.0'

async function createServer() {
  const app = express()
  const blockchainService = new BlockchainService()

  // Security and performance middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "'unsafe-eval'",
          "https://mainnet.base.org",
          "https://cdnjs.cloudflare.com",
          "https://api.i18nexus.com"
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: [
          "'self'", 
          "https://mainnet.base.org",
          "https://api.i18nexus.com",
          "wss://mainnet.base.org",
          "https://www.stimapp.com"
        ],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false
  }))

  app.use(compression())
  app.use(cors({
    origin: isProduction ? ['https://www.stimapp.com', 'https://stimapp.com'] : true,
    credentials: true
  }))

  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  let vite
  if (!isProduction) {
    // Development mode
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
      root: path.resolve(__dirname, '..')
    })
    app.use(vite.middlewares)
  } else {
    // Production mode
    const distPath = path.resolve(__dirname, '../dist')
    const clientPath = path.join(distPath, 'client')
    
    // Serve static files with proper caching
    app.use(express.static(clientPath, {
      maxAge: '1y',
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache')
        }
      }
    }))
  }

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    })
  })

  // API endpoint for events data with caching
  let cachedEventsData = null
  let lastCacheTime = 0
  const CACHE_DURATION = 30000 // 30 seconds

  app.get('/api/events', async (req, res) => {
    try {
      const now = Date.now()
      
      // Return cached data if it's still fresh
      if (cachedEventsData && (now - lastCacheTime) < CACHE_DURATION) {
        return res.json(cachedEventsData)
      }

      // Fetch fresh data
      const data = await blockchainService.getAllEventsData()
      
      // Update cache
      cachedEventsData = data
      lastCacheTime = now

      // Set cache headers
      res.setHeader('Cache-Control', 'public, max-age=30')
      res.setHeader('ETag', `"${now}"`)
      
      res.json(data)
    } catch (error) {
      console.error('API Error:', error)
      
      // Return cached data if available, even if stale
      if (cachedEventsData) {
        console.log('Returning stale cached data due to error')
        return res.json(cachedEventsData)
      }
      
      res.status(500).json({ 
        error: 'Failed to fetch events',
        timestamp: new Date().toISOString()
      })
    }
  })

  // Cache invalidation endpoint (for manual refresh)
  app.post('/api/events/refresh', (req, res) => {
    cachedEventsData = null
    lastCacheTime = 0
    res.json({ message: 'Cache cleared' })
  })

  // SSR route with improved error handling
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl

    try {
      let template
      
      if (!isProduction) {
        // Development: read template and transform
        template = fs.readFileSync(
          path.resolve(__dirname, '../index.html'),
          'utf-8'
        )
        template = await vite.transformIndexHtml(url, template)
      } else {
        // Production: read built template
        const templatePath = path.resolve(__dirname, '../dist/client/index.html')
        if (!fs.existsSync(templatePath)) {
          throw new Error('Production build not found. Run "npm run build" first.')
        }
        template = fs.readFileSync(templatePath, 'utf-8')
      }

      // Pre-fetch blockchain data for specific routes
      let initialData = null
      const shouldPreFetch = [
        '/',
        '/predict',
        '/home'
      ].some(route => url === route || url.startsWith(route))

      if (shouldPreFetch) {
        try {
          // Try to get cached data first
          const now = Date.now()
          if (cachedEventsData && (now - lastCacheTime) < CACHE_DURATION) {
            initialData = cachedEventsData
          } else {
            // Fetch fresh data with timeout
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Blockchain fetch timeout')), 10000)
            )
            
            initialData = await Promise.race([
              blockchainService.getAllEventsData(),
              timeoutPromise
            ])
            
            // Update cache
            cachedEventsData = initialData
            lastCacheTime = now
          }
        } catch (error) {
          console.error('Error pre-fetching blockchain data:', error)
          // Use cached data if available, otherwise empty state
          initialData = cachedEventsData || { 
            events: [], 
            categories: [{ id: "all", label: "All Categories" }] 
          }
        }
      }

      // Inject initial data and meta tags
      let html = template

      // Add meta tags for SEO
      const metaTags = `
        <meta property="og:title" content="STIM - Decentralized Prediction Platform" />
        <meta property="og:description" content="Make predictions and earn rewards on the blockchain" />
        <meta property="og:url" content="https://www.stimapp.com${url}" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="STIM App" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="STIM - Decentralized Predictions" />
        <meta name="twitter:description" content="Make predictions and earn rewards on the blockchain" />
        <link rel="canonical" href="https://www.stimapp.com${url}" />
      `

      html = html.replace('<head>', `<head>${metaTags}`)

      // Inject initial data
      if (initialData) {
        const dataScript = `<script>window.__INITIAL_DATA__ = ${JSON.stringify(initialData).replace(/</g, '\\u003c')}</script>`
        html = html.replace(
          '<div id="root"></div>',
          `<div id="root"></div>${dataScript}`
        )
      }

      // Set appropriate headers
      res.setHeader('Content-Type', 'text/html')
      if (shouldPreFetch && initialData) {
        res.setHeader('Cache-Control', 'public, max-age=30')
      }

      res.status(200).end(html)
    } catch (error) {
      console.error('SSR Error:', error)
      
      if (!isProduction && vite) {
        vite.ssrFixStacktrace(error)
      }
      
      // In production, serve a fallback page
      if (isProduction) {
        try {
          const fallback = fs.readFileSync(
            path.resolve(__dirname, '../dist/client/index.html'),
            'utf-8'
          )
          res.status(200).setHeader('Content-Type', 'text/html').end(fallback)
        } catch (fallbackError) {
          res.status(500).send('Internal Server Error')
        }
      } else {
        res.status(500).end(error.stack)
      }
    }
  })

  return { app, vite }
}

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  process.exit(0)
})

createServer().then(({ app }) => {
  app.listen(port, host, () => {
    console.log(`🚀 Server running at http://${host}:${port}`)
    console.log(`📱 Production URL: https://www.stimapp.com`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  })
}).catch(error => {
  console.error('Failed to start server:', error)
  process.exit(1)
})