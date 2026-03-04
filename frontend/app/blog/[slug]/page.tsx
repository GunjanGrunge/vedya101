import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import Footer from '../../../components/Footer'
import { getPostBySlug, getAllSlugs } from '../../../lib/blog-data'
import 'bootstrap-icons/font/bootstrap-icons.css'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  return (
    <div className="min-h-screen">
      <Navbar showBackButton />
      <article className="pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/blog" className="inline-flex items-center gap-2 text-gray-600 hover:text-vedya-purple font-medium mb-8 transition-colors">
            <i className="bi bi-arrow-left" />
            Back to Blog
          </Link>
          <header className="mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-vedya-purple/10 text-vedya-purple text-sm font-medium mb-4">{post.category}</span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-500 text-sm">
              <span>{post.date}</span>
              <span>·</span>
              <span>{post.readTime}</span>
              <span>·</span>
              <span>{post.author}</span>
            </div>
          </header>
          <div className="relative rounded-2xl overflow-hidden shadow-xl mb-10 aspect-[2/1] bg-gray-100">
            <Image src={post.image} alt={post.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 896px" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
          </div>
          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-600 leading-relaxed mb-8">{post.excerpt}</p>
            <div className="text-gray-700 leading-relaxed whitespace-pre-line">{post.body}</div>
          </div>
          <footer className="mt-14 pt-8 border-t border-gray-200">
            <Link href="/blog" className="inline-flex items-center gap-2 text-vedya-purple font-semibold hover:gap-3 transition-all">
              Back to all posts
              <i className="bi bi-arrow-right" />
            </Link>
          </footer>
        </div>
      </article>
      <Footer />
    </div>
  )
}
