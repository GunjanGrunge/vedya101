'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { POSTS, CATEGORIES, type Post, type Category } from '../../lib/blog-data'
import 'bootstrap-icons/font/bootstrap-icons.css'

function matchesSearch(post: Post, keyword: string): boolean {
  if (!keyword.trim()) return true
  const k = keyword.toLowerCase().trim()
  return (
    post.title.toLowerCase().includes(k) ||
    post.excerpt.toLowerCase().includes(k) ||
    post.category.toLowerCase().includes(k) ||
    post.author.toLowerCase().includes(k)
  )
}

export default function BlogPage() {
  const [mounted, setMounted] = useState(false)
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const heroRef = useRef<HTMLElement>(null)
  const featuredRef = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLElement>(null)
  const [heroVisible, setHeroVisible] = useState(false)
  const [featuredVisible, setFeaturedVisible] = useState(false)
  const [gridVisible, setGridVisible] = useState(false)

  const featuredPost = POSTS.find((p) => p.featured) ?? POSTS[0]
  const categoryMatch = (p: Post) => activeCategory === 'All' || p.category === activeCategory
  const searchMatch = (p: Post) => matchesSearch(p, searchKeyword)
  const showFeatured =
    (activeCategory === 'All' || featuredPost.category === activeCategory) && searchMatch(featuredPost)
  const filteredPosts = POSTS.filter((p) => !p.featured && categoryMatch(p) && searchMatch(p))

  const runSearch = () => setSearchKeyword(searchInput.trim())

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const id = entry.target.getAttribute('data-section')
          if (id === 'hero') setHeroVisible(true)
          if (id === 'featured') setFeaturedVisible(true)
          if (id === 'grid') setGridVisible(true)
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    )
    ;[heroRef, featuredRef, gridRef].forEach((ref) => {
      if (ref.current) observer.observe(ref.current)
    })
    return () => observer.disconnect()
  }, [mounted])

  return (
    <div className="min-h-screen">
      <Navbar showBackButton />

      <section ref={heroRef} data-section="hero" className="relative overflow-hidden pt-28 pb-16 md:pb-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[32rem] h-[32rem] bg-vedya-purple/15 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-vedya-pink/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.7)_100%)]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className={`text-sm md:text-base font-medium text-vedya-purple mb-3 uppercase tracking-[0.2em] transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>Ideas & Updates</p>
          <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold mb-4 transition-all duration-700 delay-75 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <span className="gradient-text">Blog</span>
          </h1>
          <p className={`text-lg text-gray-600 max-w-2xl mx-auto transition-all duration-700 delay-150 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Insights on AI, learning science, and building the future of education.
          </p>
        </div>
      </section>

      <div className="sticky top-[7rem] z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    activeCategory === cat ? 'bg-gradient-to-r from-vedya-purple to-vedya-pink text-white shadow-lg shadow-vedya-purple/20 scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-1 sm:flex-initial sm:min-w-[280px] max-w-md mx-auto sm:mx-0">
              <input
                type="text"
                placeholder="Search posts by keyword..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-vedya-purple focus:border-transparent outline-none"
              />
              <button onClick={runSearch} className="px-4 py-2.5 rounded-xl bg-vedya-purple text-white font-medium text-sm hover:bg-vedya-dark-purple transition-colors flex items-center gap-2 shrink-0" aria-label="Search">
                <i className="bi bi-search" />
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {showFeatured && (
        <section ref={featuredRef} data-section="featured" className="py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`transition-all duration-700 ${featuredVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <Link href={`/blog/${featuredPost.slug}`} className="group block">
                <article className="relative overflow-hidden rounded-3xl bg-gray-900 text-white shadow-2xl hover:shadow-vedya-purple/20 transition-all duration-500 hover:-translate-y-1">
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />
                  </div>
                  <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[320px] md:min-h-[380px]">
                    <div className="relative order-1 lg:order-2 min-h-[200px] lg:min-h-full">
                      <Image src={featuredPost.image} alt="" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
                    </div>
                    <div className="flex flex-col justify-end p-8 md:p-10 lg:p-12 order-2 lg:order-1 z-20">
                      <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-medium mb-4 w-fit">{featuredPost.category}</span>
                      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 group-hover:text-vedya-yellow transition-colors duration-300">{featuredPost.title}</h2>
                      <p className="text-gray-200 text-lg mb-6 line-clamp-2">{featuredPost.excerpt}</p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
                        <span>{featuredPost.date}</span>
                        <span>·</span>
                        <span>{featuredPost.readTime}</span>
                      </div>
                      <span className="inline-flex items-center gap-2 mt-6 text-vedya-yellow font-medium group-hover:gap-3 transition-all duration-300">
                        Read article
                        <i className="bi bi-arrow-right" />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            </div>
          </div>
        </section>
      )}

      <section ref={gridRef} data-section="grid" className="py-12 md:py-20 pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-8">
            {activeCategory === 'All' && !searchKeyword && 'Latest posts'}
            {activeCategory !== 'All' && !searchKeyword && activeCategory}
            {searchKeyword && `Results for "${searchKeyword}"`}
          </h2>
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 transition-all duration-500 ${gridVisible ? 'opacity-100' : 'opacity-0'}`}>
            {filteredPosts.map((post, i) => (
              <div key={post.id} className="transition-all duration-700 ease-out" style={{ opacity: gridVisible ? 1 : 0, transform: gridVisible ? 'translateY(0)' : 'translateY(20px)', transitionDelay: `${Math.min(i * 80, 400)}ms` }}>
                <BlogCard post={post} />
              </div>
            ))}
          </div>
          {filteredPosts.length === 0 && (
            <p className="text-center text-gray-500 py-12">
              {searchKeyword || activeCategory !== 'All' ? 'No posts match your filters. Try a different category or keyword.' : 'No posts in this category yet.'}
            </p>
          )}
        </div>
      </section>

      <section className="py-16 md:py-20 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Stay in the loop</h2>
          <p className="text-gray-600 mb-8">Get the latest posts and product updates in your inbox.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <input type="email" placeholder="you@example.com" className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-vedya-purple focus:border-transparent outline-none transition-shadow" />
            <button className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-vedya-purple to-vedya-pink hover:shadow-lg hover:shadow-vedya-purple/25 transition-all duration-300 hover:scale-[1.02]">Subscribe</button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function BlogCard({ post }: { post: Post }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <article className="h-full flex flex-col rounded-2xl bg-white border border-gray-200/80 shadow-lg overflow-hidden hover:shadow-2xl hover:border-vedya-purple/20 hover:-translate-y-2 transition-all duration-300">
        <div className="relative h-44 overflow-hidden">
          <Image src={post.image} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur text-xs font-medium text-gray-800">{post.category}</span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/10">
            <span className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <i className="bi bi-arrow-up-right text-white text-xl" />
            </span>
          </div>
        </div>
        <div className="flex-1 flex flex-col p-5 md:p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-vedya-purple transition-colors duration-300 line-clamp-2">{post.title}</h3>
          <p className="text-gray-600 text-sm leading-relaxed flex-1 line-clamp-2 mb-4">{post.excerpt}</p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{post.date}</span>
            <span>{post.readTime}</span>
          </div>
        </div>
      </article>
    </Link>
  )
}
