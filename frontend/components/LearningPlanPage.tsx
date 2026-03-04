'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

interface LearningModule {
  id: string
  title: string
  description: string
  duration: string
  concepts: string[]
  objectives: string[]
}

interface KanbanTask {
  id: string
  title: string
  status: string
  module: string
}

interface LearningPlan {
  plan_id: string
  title: string
  description: string
  subject: string
  total_duration: string
  difficulty_level: string
  modules: LearningModule[]
  kanban_tasks: KanbanTask[]
}

interface LearningPlanPageProps {
  planData: LearningPlan
}

export default function LearningPlanPage({ planData }: LearningPlanPageProps) {
  const router = useRouter()
  const { user } = useUser()
  const [selectedTab, setSelectedTab] = useState<'overview' | 'modules' | 'kanban'>('overview')

  const handleStartLearning = () => {
    // Open teaching interface in new window/tab
    const teachingUrl = `/teaching/${planData.plan_id}`
    window.open(teachingUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'todo': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{planData.title}</h1>
              <p className="text-gray-600 mt-1">{planData.description}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                <span className="font-medium">Duration:</span> {planData.total_duration}
              </div>
              <div className="text-sm text-gray-500">
                <span className="font-medium">Level:</span> {planData.difficulty_level}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'modules', label: 'Learning Modules' },
              { id: 'kanban', label: 'Progress Board' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 pb-8">
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Plan Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">Learning Plan Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{planData.modules.length}</div>
                  <div className="text-sm text-gray-600">Learning Modules</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{planData.total_duration}</div>
                  <div className="text-sm text-gray-600">Total Duration</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{planData.kanban_tasks.length}</div>
                  <div className="text-sm text-gray-600">Learning Tasks</div>
                </div>
              </div>
            </div>

            {/* Quick Module Overview */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Learning Journey</h3>
              <div className="space-y-4">
                {planData.modules.map((module, index) => (
                  <div key={module.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{module.title}</h4>
                      <p className="text-gray-600 text-sm mt-1">{module.description}</p>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <span>{module.duration}</span>
                        <span className="mx-2">•</span>
                        <span>{module.concepts.length} concepts</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Start Learning Button */}
            <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Ready to Begin?</h3>
              <p className="text-gray-600 mb-4">
                Your personalized learning plan is ready. Click below to start your interactive learning journey with our AI teacher.
              </p>
              <button
                onClick={handleStartLearning}
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Start Learning Journey
              </button>
            </div>
          </div>
        )}

        {selectedTab === 'modules' && (
          <div className="space-y-6">
            {planData.modules.map((module, index) => (
              <div key={module.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Module {index + 1}: {module.title}</h3>
                    <p className="text-gray-600 mt-1">{module.description}</p>
                    <div className="text-sm text-gray-500 mt-2">Duration: {module.duration}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Key Concepts</h4>
                    <ul className="space-y-1">
                      {module.concepts.map((concept, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-center">
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full mr-2"></span>
                          {concept}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Learning Objectives</h4>
                    <ul className="space-y-1">
                      {module.objectives.map((objective, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-center">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></span>
                          {objective}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'kanban' && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Learning Progress Board</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['todo', 'in_progress', 'completed'].map((status) => (
                <div key={status} className="space-y-3">
                  <h4 className="font-medium text-gray-900 capitalize flex items-center">
                    {status === 'todo' && '📝 To Do'}
                    {status === 'in_progress' && '🔄 In Progress'} 
                    {status === 'completed' && '✅ Completed'}
                    <span className="ml-2 text-sm text-gray-500">
                      ({planData.kanban_tasks.filter(task => task.status === status).length})
                    </span>
                  </h4>
                  
                  <div className="space-y-2">
                    {planData.kanban_tasks
                      .filter(task => task.status === status)
                      .map((task) => (
                        <div key={task.id} className="p-3 border rounded-lg bg-gray-50">
                          <div className="font-medium text-sm text-gray-900">{task.title}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Module: {planData.modules.find(m => m.id === task.module)?.title || task.module}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {user?.firstName}, your personalized {planData.subject} learning plan is ready!
            </div>
            <button
              onClick={handleStartLearning}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Start Learning
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
