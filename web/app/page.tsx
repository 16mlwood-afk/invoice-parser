export default function HomePage() {

  return (

    <div className="min-h-screen bg-white dark:bg-gray-900">

      {/* Hero Section */}

      <section className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 py-20">

        <div className="container mx-auto px-4 text-center">

          <div className="inline-block mb-4 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">

            🤖 AI-Powered Invoice Processing

          </div>



          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">

            Process Invoices with{' '}

            <span className="text-blue-600 dark:text-blue-400">AI Precision</span>

          </h1>



          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">

            Transform your Amazon and retailer invoices into structured data with advanced

            PDF parsing technology. Upload, process, and analyze invoices in seconds with

            our intelligent parsing engine.

          </p>



          <div className="flex gap-4 justify-center">

            <a href="/upload" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors shadow-lg inline-block text-center">

              ✨ Start Processing

            </a>

            <a href="/dashboard" className="px-8 py-4 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-semibold transition-colors border-2 border-gray-200 dark:border-gray-600 inline-block text-center">

              📊 View Dashboard

            </a>

          </div>

        </div>

      </section>



      {/* Feature Cards - FIXED CONTRAST */}

      <section className="py-16 bg-white dark:bg-gray-900">

        <div className="container mx-auto px-4">

          <div className="grid md:grid-cols-3 gap-6">



            {/* Batch Upload Card - Light background in dark mode */}

            <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-8 hover:shadow-lg dark:hover:shadow-blue-500/10 transition-all">

              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">

                <span className="text-2xl">📤</span>

              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">

                Batch Upload

              </h3>

              <p className="text-gray-600 dark:text-gray-300">

                Upload multiple PDF invoices simultaneously with drag-and-drop

                interface and real-time validation.

              </p>

            </div>



            {/* AI Processing Card */}

            <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-8 hover:shadow-lg dark:hover:shadow-green-500/10 transition-all">

              <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center mb-4">

                <span className="text-2xl">🤖</span>

              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">

                AI Processing

              </h3>

              <p className="text-gray-600 dark:text-gray-300">

                Advanced machine learning algorithms extract data with 99%+ accuracy

                across multiple invoice formats.

              </p>

            </div>



            {/* Smart Analytics Card */}

            <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-8 hover:shadow-lg dark:hover:shadow-orange-500/10 transition-all">

              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">

                <span className="text-2xl">📊</span>

              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">

                Smart Analytics

              </h3>

              <p className="text-gray-600 dark:text-gray-300">

                Compare invoices, track spending patterns, and export data in multiple

                formats for accounting software.

              </p>

            </div>

          </div>

        </div>

      </section>



      {/* Stats Section - Keep the good contrast */}

      <section className="py-12 bg-blue-600 dark:bg-blue-700">

        <div className="container mx-auto px-4">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">

            <div>

              <div className="text-4xl font-bold mb-2">50+</div>

              <div className="text-blue-100">Supported Retailers</div>

            </div>

            <div>

              <div className="text-4xl font-bold mb-2">99%</div>

              <div className="text-blue-100">Accuracy Rate</div>

            </div>

            <div>

              <div className="text-4xl font-bold mb-2">10x</div>

              <div className="text-blue-100">Faster Processing</div>

            </div>

            <div>

              <div className="text-4xl font-bold mb-2">24/7</div>

              <div className="text-blue-100">Always Available</div>

            </div>

          </div>

        </div>

      </section>



      {/* Quick Start Section */}

      <section className="py-16 bg-gray-50 dark:bg-gray-800">

        <div className="container mx-auto px-4">

          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">

            Quick Start

          </h2>



          <div className="grid md:grid-cols-4 gap-6">

            <QuickStartCard

              icon="📁"

              title="Upload Files"

              description="Start with your invoice PDFs"

            />

            <QuickStartCard

              icon="⚡"

              title="Monitor Progress"

              description="Track processing status"

            />

            <QuickStartCard

              icon="📋"

              title="View Results"

              description="Access processed data"

            />

            <QuickStartCard

              icon="⚙️"

              title="Configure"

              description="Customize your experience"

            />

          </div>

        </div>

      </section>

    </div>

  );

}



function QuickStartCard({ icon, title, description }: {

  icon: string;

  title: string;

  description: string;

}) {

  return (

    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center hover:shadow-lg dark:hover:shadow-blue-500/10 transition-all">

      <div className="text-4xl mb-4">{icon}</div>

      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>

      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>

    </div>

  );

}
