import 'bootstrap-icons/font/bootstrap-icons.css'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    product: [
      { name: 'Features', href: '/features' },
      { name: 'AI Agents', href: '/ai-agents' },
      { name: 'Learning Paths', href: '/learning-paths' },
      { name: 'Assessments', href: '/assessments' },
      { name: 'Progress Tracking', href: '/progress-tracking' }
    ],
    company: [
      { name: 'About Us', href: '/about-us' },
      { name: 'Blog', href: '/blog' },
      { name: 'Press', href: '/press' }
    ],
    resources: [
      { name: 'Documentation', href: '/documentation' },
      { name: 'API Reference', href: '/api-reference' },
      { name: 'Help Center', href: '/help-center' }
    ],
    legal: [
      { name: 'Privacy Policy', href: '#' },
      { name: 'Terms of Service', href: '#' },
      { name: 'Cookie Policy', href: '#' },
      { name: 'Security', href: '#' },
      { name: 'Compliance', href: '#' }
    ]
  }

  return (
    <footer id="contact" className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Brand Section */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h3 className="text-3xl font-bold gradient-text-white">VEDYA</h3>
                <p className="text-gray-400 mt-2">
                  Powered by AI. Designed for learners.
                </p>
              </div>
              <p className="text-gray-300 leading-relaxed mb-6">
                Experience the future of education with our AI-powered platform.
                Personalized learning paths, intelligent assessments, and real-time
                progress tracking make learning more effective and engaging.
              </p>

              {/* Newsletter Signup */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3">Stay Updated</h4>
                <div className="flex">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-vedya-purple focus:border-transparent text-white placeholder-gray-400"
                  />
                  <button className="bg-gradient-to-r from-vedya-purple to-vedya-pink px-6 py-2 rounded-r-lg hover:from-vedya-purple/90 hover:to-vedya-pink/90 transition-all duration-300 font-medium">
                    Subscribe
                  </button>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex space-x-4">
                <SocialLink href="#" icon={<i className="bi bi-twitter"></i>} label="Twitter" />
                <SocialLink href="#" icon={<i className="bi bi-facebook"></i>} label="Facebook" />
                <SocialLink href="#" icon={<i className="bi bi-linkedin"></i>} label="LinkedIn" />
                <SocialLink href="#" icon={<i className="bi bi-instagram"></i>} label="Instagram" />
                <SocialLink href="#" icon={<i className="bi bi-youtube"></i>} label="YouTube" />
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-vedya-yellow">Product</h4>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors duration-200"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-vedya-pink">Company</h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors duration-200"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-vedya-orange">Resources</h4>
              <ul className="space-y-3">
                {footerLinks.resources.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors duration-200"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Features Highlight */}
          <div className="mt-16 pt-8 border-t border-gray-800">
            <h4 className="text-xl font-semibold mb-6 text-center">Why Choose VEDYA?</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureHighlight
                icon={<i className="bi bi-cpu-fill text-4xl"></i>}
                title="AI-Powered Learning"
                description="Adaptive algorithms that personalize your educational journey"
              />
              <FeatureHighlight
                icon={<i className="bi bi-graph-up-arrow text-4xl"></i>}
                title="Real-time Analytics"
                description="Track your progress with detailed insights and recommendations"
              />
              <FeatureHighlight
                icon={<i className="bi bi-bullseye text-4xl"></i>}
                title="Goal-Oriented"
                description="Structured learning paths designed to achieve your objectives"
              />
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
              <p className="text-gray-400 text-sm">
                © {currentYear} VEDYA. All rights reserved.
              </p>
              <div className="flex space-x-6">
                {footerLinks.legal.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-2">
              <p className="text-gray-400 text-sm">
                Made with
              </p>
              <i className="bi bi-heart-fill text-red-500 animate-pulse"></i>
              <p className="text-gray-400 text-sm">
                for learners worldwide
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

interface SocialLinkProps {
  href: string
  icon: React.ReactNode
  label: string
}

function SocialLink({ href, icon, label }: SocialLinkProps) {
  return (
    <a
      href={href}
      className="group w-12 h-12 bg-gray-800 hover:bg-gradient-to-r hover:from-vedya-purple hover:to-vedya-pink rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 hover:rotate-6"
      aria-label={label}
    >
      <span className="text-xl text-gray-300 group-hover:text-white transition-colors duration-300">{icon}</span>
    </a>
  )
}

interface FeatureHighlightProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureHighlight({ icon, title, description }: FeatureHighlightProps) {
  return (
    <div className="text-center group">
      <div className="text-vedya-purple mb-3 flex justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">{icon}</div>
      <h5 className="text-lg font-semibold text-white mb-2 transition-colors duration-300 group-hover:text-vedya-yellow">{title}</h5>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  )
}
