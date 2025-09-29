import { ref, readonly } from 'vue'
import type { 
  Schedule, 
  Rule, 
  Course, 
  Teacher, 
  Group, 
  Subject,
  Lesson
} from '../stores'

// API Configuration
const API_BASE_URL = process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3001'

// Types for API requests/responses
export interface ApiResponse<T> {
  data: T
  message?: string
  status: 'success' | 'error'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ScheduleGenerationRequest {
  courseIds: string[]
  teacherIds: string[]
  groupIds: string[]
  constraints: Rule[]
  preferences: Rule[]
  maxAttempts?: number
  timeoutMs?: number
}

export interface ScheduleGenerationResponse {
  schedule: Schedule
  metadata: {
    generationTime: number
    attempts: number
    conflicts: number
    satisfiedRules: number
    totalRules: number
  }
  alternatives?: Schedule[]
}

// Base API client class
class ApiClient {
  private baseUrl: string
  private headers: Record<string, string>

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    this.headers = {
      'Content-Type': 'application/json'
    }
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        response.status,
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        errorData
      )
    }

    return response.json()
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const searchParams = params ? new URLSearchParams(params).toString() : ''
    const url = searchParams ? `${endpoint}?${searchParams}` : endpoint
    
    return this.request<T>(url, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  setAuthToken(token: string) {
    this.headers.Authorization = `Bearer ${token}`
  }

  removeAuthToken() {
    delete this.headers.Authorization
  }
}

// Custom API Error class
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }

  get isServerError(): boolean {
    return this.status >= 500
  }

  get isNetworkError(): boolean {
    return this.status === 0
  }
}

// Initialize API client
const apiClient = new ApiClient(API_BASE_URL)

// Schedules API
export const schedulesApi = {
  async getAll(params?: {
    page?: number
    pageSize?: number
    status?: 'draft' | 'published' | 'archived'
    search?: string
  }): Promise<PaginatedResponse<Schedule>> {
    return apiClient.get<PaginatedResponse<Schedule>>('/schedules', params)
  },

  async getById(id: string): Promise<ApiResponse<Schedule>> {
    return apiClient.get<ApiResponse<Schedule>>(`/schedules/${id}`)
  },

  async create(scheduleData: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Schedule>> {
    return apiClient.post<ApiResponse<Schedule>>('/schedules', scheduleData)
  },

  async update(id: string, scheduleData: Partial<Schedule>): Promise<ApiResponse<Schedule>> {
    return apiClient.put<ApiResponse<Schedule>>(`/schedules/${id}`, scheduleData)
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/schedules/${id}`)
  },

  async generate(request: ScheduleGenerationRequest): Promise<ApiResponse<ScheduleGenerationResponse>> {
    return apiClient.post<ApiResponse<ScheduleGenerationResponse>>('/schedules/generate', request)
  },

  async duplicate(id: string, name?: string): Promise<ApiResponse<Schedule>> {
    return apiClient.post<ApiResponse<Schedule>>(`/schedules/${id}/duplicate`, { name })
  },

  async publish(id: string): Promise<ApiResponse<Schedule>> {
    return apiClient.patch<ApiResponse<Schedule>>(`/schedules/${id}/publish`)
  },

  async archive(id: string): Promise<ApiResponse<Schedule>> {
    return apiClient.patch<ApiResponse<Schedule>>(`/schedules/${id}/archive`)
  },

  async validate(id: string): Promise<ApiResponse<{
    isValid: boolean
    conflicts: Array<{
      type: 'time_conflict' | 'teacher_conflict' | 'room_conflict'
      lessonIds: string[]
      message: string
    }>
    warnings: Array<{
      type: 'rule_violation' | 'preference_ignored'
      ruleId?: string
      message: string
    }>
  }>> {
    return apiClient.get<ApiResponse<any>>(`/schedules/${id}/validate`)
  }
}

// Rules API
export const rulesApi = {
  async getAll(params?: {
    type?: 'constraint' | 'preference'
    enabled?: boolean
  }): Promise<ApiResponse<Rule[]>> {
    return apiClient.get<ApiResponse<Rule[]>>('/rules', params)
  },

  async getById(id: string): Promise<ApiResponse<Rule>> {
    return apiClient.get<ApiResponse<Rule>>(`/rules/${id}`)
  },

  async create(ruleData: Omit<Rule, 'id'>): Promise<ApiResponse<Rule>> {
    return apiClient.post<ApiResponse<Rule>>('/rules', ruleData)
  },

  async update(id: string, ruleData: Partial<Rule>): Promise<ApiResponse<Rule>> {
    return apiClient.put<ApiResponse<Rule>>(`/rules/${id}`, ruleData)
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/rules/${id}`)
  },

  async toggle(id: string, enabled: boolean): Promise<ApiResponse<Rule>> {
    return apiClient.patch<ApiResponse<Rule>>(`/rules/${id}`, { enabled })
  },

  async validate(ruleData: Omit<Rule, 'id'>): Promise<ApiResponse<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }>> {
    return apiClient.post<ApiResponse<any>>('/rules/validate', ruleData)
  },

  async checkConflicts(ruleId: string): Promise<ApiResponse<{
    conflicts: Rule[]
    reasons: string[]
  }>> {
    return apiClient.get<ApiResponse<any>>(`/rules/${ruleId}/conflicts`)
  }
}

// Courses API
export const coursesApi = {
  async getAll(): Promise<ApiResponse<Course[]>> {
    return apiClient.get<ApiResponse<Course[]>>('/courses')
  },

  async getById(id: string): Promise<ApiResponse<Course>> {
    return apiClient.get<ApiResponse<Course>>(`/courses/${id}`)
  },

  async create(courseData: Omit<Course, 'id'>): Promise<ApiResponse<Course>> {
    return apiClient.post<ApiResponse<Course>>('/courses', courseData)
  },

  async update(id: string, courseData: Partial<Course>): Promise<ApiResponse<Course>> {
    return apiClient.put<ApiResponse<Course>>(`/courses/${id}`, courseData)
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/courses/${id}`)
  }
}

// Teachers API
export const teachersApi = {
  async getAll(): Promise<ApiResponse<Teacher[]>> {
    return apiClient.get<ApiResponse<Teacher[]>>('/teachers')
  },

  async getById(id: string): Promise<ApiResponse<Teacher>> {
    return apiClient.get<ApiResponse<Teacher>>(`/teachers/${id}`)
  },

  async create(teacherData: Omit<Teacher, 'id'>): Promise<ApiResponse<Teacher>> {
    return apiClient.post<ApiResponse<Teacher>>('/teachers', teacherData)
  },

  async update(id: string, teacherData: Partial<Teacher>): Promise<ApiResponse<Teacher>> {
    return apiClient.put<ApiResponse<Teacher>>(`/teachers/${id}`, teacherData)
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/teachers/${id}`)
  },

  async getAvailability(id: string, date?: string): Promise<ApiResponse<{
    available: boolean
    timeSlots: Array<{
      dayOfWeek: number
      startTime: string
      endTime: string
      available: boolean
    }>
  }>> {
    const params = date ? { date } : undefined
    return apiClient.get<ApiResponse<any>>(`/teachers/${id}/availability`, params)
  }
}

// Groups API
export const groupsApi = {
  async getAll(): Promise<ApiResponse<Group[]>> {
    return apiClient.get<ApiResponse<Group[]>>('/groups')
  },

  async getById(id: string): Promise<ApiResponse<Group>> {
    return apiClient.get<ApiResponse<Group>>(`/groups/${id}`)
  },

  async create(groupData: Omit<Group, 'id'>): Promise<ApiResponse<Group>> {
    return apiClient.post<ApiResponse<Group>>('/groups', groupData)
  },

  async update(id: string, groupData: Partial<Group>): Promise<ApiResponse<Group>> {
    return apiClient.put<ApiResponse<Group>>(`/groups/${id}`, groupData)
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/groups/${id}`)
  }
}

// Subjects API
export const subjectsApi = {
  async getAll(): Promise<ApiResponse<Subject[]>> {
    return apiClient.get<ApiResponse<Subject[]>>('/subjects')
  },

  async getById(id: string): Promise<ApiResponse<Subject>> {
    return apiClient.get<ApiResponse<Subject>>(`/subjects/${id}`)
  },

  async create(subjectData: Omit<Subject, 'id'>): Promise<ApiResponse<Subject>> {
    return apiClient.post<ApiResponse<Subject>>('/subjects', subjectData)
  },

  async update(id: string, subjectData: Partial<Subject>): Promise<ApiResponse<Subject>> {
    return apiClient.put<ApiResponse<Subject>>(`/subjects/${id}`, subjectData)
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/subjects/${id}`)
  }
}

// Lessons API
export const lessonsApi = {
  async getBySchedule(scheduleId: string): Promise<ApiResponse<Lesson[]>> {
    return apiClient.get<ApiResponse<Lesson[]>>(`/schedules/${scheduleId}/lessons`)
  },

  async create(scheduleId: string, lessonData: Omit<Lesson, 'id'>): Promise<ApiResponse<Lesson>> {
    return apiClient.post<ApiResponse<Lesson>>(`/schedules/${scheduleId}/lessons`, lessonData)
  },

  async update(scheduleId: string, lessonId: string, lessonData: Partial<Lesson>): Promise<ApiResponse<Lesson>> {
    return apiClient.put<ApiResponse<Lesson>>(`/schedules/${scheduleId}/lessons/${lessonId}`, lessonData)
  },

  async delete(scheduleId: string, lessonId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/schedules/${scheduleId}/lessons/${lessonId}`)
  },

  async move(scheduleId: string, lessonId: string, newTimeSlot: {
    dayOfWeek: number
    startTime: string
    endTime: string
  }): Promise<ApiResponse<Lesson>> {
    return apiClient.patch<ApiResponse<Lesson>>(`/schedules/${scheduleId}/lessons/${lessonId}/move`, newTimeSlot)
  }
}

// Export the main API client and all service APIs
export { apiClient }

// Composable for API error handling
export const useApiErrorHandler = () => {
  const handleApiError = (error: any) => {
    if (error instanceof ApiError) {
      // Handle different types of API errors
      switch (error.status) {
        case 400:
          return 'Invalid request. Please check your input.'
        case 401:
          return 'Authentication required. Please log in.'
        case 403:
          return 'Access denied. You do not have permission to perform this action.'
        case 404:
          return 'Resource not found.'
        case 409:
          return 'Conflict detected. Please resolve and try again.'
        case 422:
          return error.data?.message || 'Validation failed. Please check your input.'
        case 429:
          return 'Too many requests. Please wait and try again.'
        case 500:
          return 'Server error. Please try again later.'
        default:
          return error.message || 'An unexpected error occurred.'
      }
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.'
    }
    
    return error.message || 'An unexpected error occurred.'
  }

  const showErrorNotification = (error: any) => {
    const message = handleApiError(error)
    // This would integrate with your notification system
    console.error('API Error:', message, error)
    return message
  }

  return {
    handleApiError,
    showErrorNotification
  }
}

// Composable for API loading states
export const useApiLoading = () => {
  const loadingStates = ref<Record<string, boolean>>({})

  const setLoading = (key: string, loading: boolean) => {
    loadingStates.value[key] = loading
  }

  const isLoading = (key: string): boolean => {
    return loadingStates.value[key] || false
  }

  const withLoading = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    setLoading(key, true)
    try {
      return await fn()
    } finally {
      setLoading(key, false)
    }
  }

  return {
    loadingStates: readonly(loadingStates),
    setLoading,
    isLoading,
    withLoading
  }
}