<template>
  <div class="schedule-generation-workflow" data-testid="schedule-generation-workflow">
    <!-- Workflow Header -->
    <div class="workflow-header">
      <h2 class="workflow-title">Schedule Generation Workflow</h2>
      <div class="workflow-progress" data-testid="workflow-progress">
        <div class="progress-steps">
          <div 
            v-for="(step, index) in workflowSteps" 
            :key="step.id"
            :class="['progress-step', {
              'active': currentStep === index,
              'completed': index < currentStep,
              'disabled': index > currentStep
            }]"
            :data-testid="`step-${step.id}`"
          >
            <div class="step-indicator">
              <span v-if="index < currentStep" class="check-icon">✓</span>
              <span v-else>{{ index + 1 }}</span>
            </div>
            <span class="step-label">{{ step.title }}</span>
          </div>
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${(currentStep / (workflowSteps.length - 1)) * 100}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Step Content -->
    <div class="workflow-content">
      <!-- Step 1: Basic Information -->
      <div v-if="currentStep === 0" class="workflow-step" data-testid="step-basic-info">
        <h3>Basic Schedule Information</h3>
        <form @submit.prevent="nextStep" class="step-form">
          <div class="form-group">
            <label for="schedule-name">Schedule Name *</label>
            <input
              id="schedule-name"
              v-model="scheduleData.name"
              type="text"
              required
              data-testid="schedule-name"
              placeholder="Enter schedule name"
            />
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="academic-year">Academic Year *</label>
              <select
                id="academic-year"
                v-model="scheduleData.academicYear"
                required
                data-testid="academic-year"
              >
                <option value="">Select year</option>
                <option v-for="year in availableYears" :key="year" :value="year">
                  {{ year }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="semester">Semester *</label>
              <select
                id="semester"
                v-model="scheduleData.semester"
                required
                data-testid="semester"
              >
                <option value="">Select semester</option>
                <option value="fall">Fall</option>
                <option value="spring">Spring</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              v-model="scheduleData.description"
              data-testid="description"
              placeholder="Optional description"
              rows="3"
            ></textarea>
          </div>

          <div class="step-actions">
            <button type="submit" class="btn-primary" data-testid="next-step">
              Next: Configure Courses
            </button>
          </div>
        </form>
      </div>

      <!-- Step 2: Course Configuration -->
      <div v-if="currentStep === 1" class="workflow-step" data-testid="step-courses">
        <h3>Course Configuration</h3>
        
        <div class="courses-section">
          <div class="section-header">
            <h4>Courses</h4>
            <button 
              type="button" 
              class="btn-secondary" 
              @click="showAddCourseModal = true"
              data-testid="add-course"
            >
              Add Course
            </button>
          </div>

          <div v-if="scheduleData.courses.length === 0" class="empty-state">
            <p>No courses configured yet. Add your first course to get started.</p>
          </div>

          <div v-else class="courses-list" data-testid="courses-list">
            <div 
              v-for="course in scheduleData.courses" 
              :key="course.id"
              class="course-item"
              :data-testid="`course-item-${course.id}`"
            >
              <div class="course-info">
                <h5>{{ course.name }}</h5>
                <p>Teacher: {{ getTeacherName(course.teacherId) }}</p>
                <p>Groups: {{ getGroupNames(course.groupIds).join(', ') }}</p>
                <p>Weekly Hours: {{ course.weeklyHours }}</p>
              </div>
              <div class="course-actions">
                <button 
                  type="button" 
                  class="btn-icon" 
                  @click="editCourse(course)"
                  data-testid="edit-course"
                >
                  ✏️
                </button>
                <button 
                  type="button" 
                  class="btn-icon" 
                  @click="removeCourse(course.id)"
                  data-testid="delete-course"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="step-actions">
          <button 
            type="button" 
            class="btn-secondary" 
            @click="previousStep"
            data-testid="previous-step"
          >
            Previous
          </button>
          <button 
            type="button" 
            class="btn-primary" 
            :disabled="scheduleData.courses.length === 0"
            @click="nextStep"
            data-testid="next-step"
          >
            Next: Configure Constraints
          </button>
        </div>
      </div>

      <!-- Step 3: Constraints and Rules -->
      <div v-if="currentStep === 2" class="workflow-step" data-testid="step-constraints">
        <h3>Constraints and Rules</h3>
        
        <div class="constraints-section">
          <div class="constraint-group">
            <h4>Working Hours</h4>
            <div class="form-row">
              <div class="form-group">
                <label for="start-time">Start Time</label>
                <input
                  id="start-time"
                  v-model="scheduleData.constraints.workingHours.start"
                  type="time"
                  data-testid="start-time"
                />
              </div>
              <div class="form-group">
                <label for="end-time">End Time</label>
                <input
                  id="end-time"
                  v-model="scheduleData.constraints.workingHours.end"
                  type="time"
                  data-testid="end-time"
                />
              </div>
            </div>
          </div>

          <div class="constraint-group">
            <h4>Lesson Configuration</h4>
            <div class="form-row">
              <div class="form-group">
                <label for="lesson-duration">Lesson Duration (minutes)</label>
                <input
                  id="lesson-duration"
                  v-model.number="scheduleData.constraints.lessonDuration"
                  type="number"
                  min="30"
                  max="180"
                  step="15"
                  data-testid="lesson-duration"
                />
              </div>
              <div class="form-group">
                <label for="break-duration">Break Duration (minutes)</label>
                <input
                  id="break-duration"
                  v-model.number="scheduleData.constraints.breakDuration"
                  type="number"
                  min="5"
                  max="60"
                  step="5"
                  data-testid="break-duration"
                />
              </div>
            </div>
          </div>

          <div class="constraint-group">
            <h4>Daily Limits</h4>
            <div class="form-row">
              <div class="form-group">
                <label for="max-lessons-per-day">Max Lessons per Day</label>
                <input
                  id="max-lessons-per-day"
                  v-model.number="scheduleData.constraints.maxLessonsPerDay"
                  type="number"
                  min="1"
                  max="12"
                  data-testid="max-lessons-per-day"
                />
              </div>
              <div class="form-group">
                <label for="max-subject-per-day">Max Same Subject per Day</label>
                <input
                  id="max-subject-per-day"
                  v-model.number="scheduleData.constraints.maxSameSubjectPerDay"
                  type="number"
                  min="1"
                  max="4"
                  data-testid="max-subject-per-day"
                />
              </div>
            </div>
          </div>

          <div class="constraint-group">
            <h4>Additional Rules</h4>
            <div class="rules-list" data-testid="active-rules">
              <div 
                v-for="rule in activeRules" 
                :key="rule.id"
                class="rule-item"
              >
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="scheduleData.activeRuleIds"
                    :value="rule.id"
                    :data-testid="`rule-${rule.id}`"
                  />
                  <span>{{ rule.name }}</span>
                </label>
                <p class="rule-description">{{ rule.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="step-actions">
          <button 
            type="button" 
            class="btn-secondary" 
            @click="previousStep"
            data-testid="previous-step"
          >
            Previous
          </button>
          <button 
            type="button" 
            class="btn-primary" 
            @click="nextStep"
            data-testid="next-step"
          >
            Next: Generation Options
          </button>
        </div>
      </div>

      <!-- Step 4: Generation Options -->
      <div v-if="currentStep === 3" class="workflow-step" data-testid="step-generation">
        <h3>Generation Options</h3>
        
        <div class="generation-options">
          <div class="option-group">
            <h4>Algorithm Settings</h4>
            <div class="form-group">
              <label for="algorithm-type">Algorithm Type</label>
              <select
                id="algorithm-type"
                v-model="scheduleData.generationOptions.algorithm"
                data-testid="algorithm-type"
              >
                <option value="greedy">Greedy Algorithm</option>
                <option value="genetic">Genetic Algorithm</option>
                <option value="simulated-annealing">Simulated Annealing</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="scheduleData.generationOptions.useRandomization"
                  data-testid="use-randomization"
                />
                <span>Use Randomization</span>
              </label>
            </div>
          </div>

          <div class="option-group">
            <h4>Alternative Schedules</h4>
            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="scheduleData.generationOptions.generateAlternatives"
                  data-testid="generate-alternatives"
                />
                <span>Generate Alternative Schedules</span>
              </label>
            </div>
            
            <div v-if="scheduleData.generationOptions.generateAlternatives" class="form-group">
              <label for="max-alternatives">Number of Alternatives</label>
              <input
                id="max-alternatives"
                v-model.number="scheduleData.generationOptions.maxAlternatives"
                type="number"
                min="1"
                max="5"
                data-testid="max-alternatives"
              />
            </div>
          </div>

          <div class="option-group">
            <h4>Performance Settings</h4>
            <div class="form-group">
              <label for="max-iterations">Max Iterations</label>
              <input
                id="max-iterations"
                v-model.number="scheduleData.generationOptions.maxIterations"
                type="number"
                min="100"
                max="10000"
                step="100"
                data-testid="max-iterations"
              />
            </div>
            
            <div class="form-group">
              <label for="time-limit">Time Limit (seconds)</label>
              <input
                id="time-limit"
                v-model.number="scheduleData.generationOptions.timeLimit"
                type="number"
                min="5"
                max="300"
                step="5"
                data-testid="time-limit"
              />
            </div>
          </div>
        </div>

        <div class="step-actions">
          <button 
            type="button" 
            class="btn-secondary" 
            @click="previousStep"
            data-testid="previous-step"
          >
            Previous
          </button>
          <button 
            type="button" 
            class="btn-primary" 
            @click="nextStep"
            data-testid="next-step"
          >
            Review & Generate
          </button>
        </div>
      </div>

      <!-- Step 5: Review and Generate -->
      <div v-if="currentStep === 4" class="workflow-step" data-testid="step-review">
        <h3>Review & Generate Schedule</h3>
        
        <div class="review-section">
          <div class="review-group">
            <h4>Schedule Information</h4>
            <dl class="review-list">
              <dt>Name:</dt>
              <dd data-testid="review-name">{{ scheduleData.name }}</dd>
              <dt>Academic Year:</dt>
              <dd data-testid="review-year">{{ scheduleData.academicYear }}</dd>
              <dt>Semester:</dt>
              <dd data-testid="review-semester">{{ scheduleData.semester }}</dd>
              <dt>Description:</dt>
              <dd data-testid="review-description">{{ scheduleData.description || 'None' }}</dd>
            </dl>
          </div>

          <div class="review-group">
            <h4>Courses ({{ scheduleData.courses.length }})</h4>
            <div class="review-courses" data-testid="review-courses">
              <div 
                v-for="course in scheduleData.courses" 
                :key="course.id"
                class="review-course"
              >
                <strong>{{ course.name }}</strong> - 
                {{ getTeacherName(course.teacherId) }} - 
                {{ course.weeklyHours }}h/week
              </div>
            </div>
          </div>

          <div class="review-group">
            <h4>Constraints</h4>
            <dl class="review-list">
              <dt>Working Hours:</dt>
              <dd data-testid="review-working-hours">
                {{ scheduleData.constraints.workingHours.start }} - 
                {{ scheduleData.constraints.workingHours.end }}
              </dd>
              <dt>Lesson Duration:</dt>
              <dd data-testid="review-lesson-duration">{{ scheduleData.constraints.lessonDuration }} minutes</dd>
              <dt>Max Lessons/Day:</dt>
              <dd data-testid="review-max-lessons">{{ scheduleData.constraints.maxLessonsPerDay }}</dd>
            </dl>
          </div>

          <div class="review-group">
            <h4>Generation Options</h4>
            <dl class="review-list">
              <dt>Algorithm:</dt>
              <dd data-testid="review-algorithm">{{ scheduleData.generationOptions.algorithm }}</dd>
              <dt>Alternatives:</dt>
              <dd data-testid="review-alternatives">
                {{ scheduleData.generationOptions.generateAlternatives 
                   ? `Yes (${scheduleData.generationOptions.maxAlternatives})` 
                   : 'No' }}
              </dd>
              <dt>Time Limit:</dt>
              <dd data-testid="review-time-limit">{{ scheduleData.generationOptions.timeLimit }} seconds</dd>
            </dl>
          </div>
        </div>

        <div class="step-actions">
          <button 
            type="button" 
            class="btn-secondary" 
            @click="previousStep"
            data-testid="previous-step"
          >
            Previous
          </button>
          <button 
            type="button" 
            class="btn-primary btn-generate" 
            @click="generateSchedule"
            :disabled="isGenerating"
            data-testid="generate-schedule"
          >
            <span v-if="isGenerating">Generating...</span>
            <span v-else>Generate Schedule</span>
          </button>
        </div>
      </div>

      <!-- Generation Progress -->
      <div v-if="currentStep === 5" class="workflow-step" data-testid="step-progress">
        <h3>Generating Schedule</h3>
        
        <div class="generation-progress">
          <div class="progress-info">
            <div class="progress-circle">
              <svg viewBox="0 0 36 36" class="circular-chart">
                <path class="circle-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path class="circle"
                  :stroke-dasharray="`${generationProgress}, 100`"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" class="percentage">{{ Math.round(generationProgress) }}%</text>
              </svg>
            </div>
            
            <div class="progress-details" data-testid="generation-status">
              <h4>{{ generationStatus.phase }}</h4>
              <p>{{ generationStatus.description }}</p>
              <div class="progress-stats">
                <span>Iterations: {{ generationStatus.iterations }}</span>
                <span>Best Score: {{ generationStatus.bestScore?.toFixed(2) || 'N/A' }}</span>
                <span>Time: {{ generationStatus.elapsedTime }}s</span>
              </div>
            </div>
          </div>

          <div class="generation-log" data-testid="generation-log">
            <h5>Generation Log</h5>
            <div class="log-entries">
              <div 
                v-for="(entry, index) in generationLog" 
                :key="index"
                class="log-entry"
                :class="entry.type"
              >
                <span class="log-time">{{ entry.timestamp }}</span>
                <span class="log-message">{{ entry.message }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="step-actions">
          <button 
            type="button" 
            class="btn-secondary" 
            @click="cancelGeneration"
            :disabled="!isGenerating"
            data-testid="cancel-generation"
          >
            Cancel
          </button>
        </div>
      </div>

      <!-- Results -->
      <div v-if="currentStep === 6" class="workflow-step" data-testid="step-results">
        <h3>Generation Results</h3>
        
        <div v-if="generationResults" class="results-section">
          <div class="results-summary" data-testid="results-summary">
            <div class="summary-card">
              <h4>Generation Summary</h4>
              <dl>
                <dt>Status:</dt>
                <dd :class="generationResults.success ? 'success' : 'error'">
                  {{ generationResults.success ? 'Success' : 'Failed' }}
                </dd>
                <dt>Total Time:</dt>
                <dd>{{ generationResults.totalTime }}s</dd>
                <dt>Iterations:</dt>
                <dd>{{ generationResults.iterations }}</dd>
                <dt>Final Score:</dt>
                <dd>{{ generationResults.finalScore?.toFixed(2) || 'N/A' }}</dd>
              </dl>
            </div>

            <div v-if="generationResults.alternatives" class="summary-card">
              <h4>Generated Schedules</h4>
              <p>{{ generationResults.alternatives.length }} schedule(s) generated</p>
              <div class="alternatives-list" data-testid="schedule-alternatives">
                <div 
                  v-for="(alt, index) in generationResults.alternatives" 
                  :key="index"
                  class="alternative-item"
                  :class="{ active: selectedAlternative === index }"
                  @click="selectedAlternative = index"
                  :data-testid="`alternative-${index}`"
                >
                  <strong>Schedule {{ index + 1 }}</strong>
                  <span class="score">Score: {{ alt.score?.toFixed(2) || 'N/A' }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="generationResults.warnings.length > 0" class="warnings-section">
            <h4>Warnings</h4>
            <div class="warnings-list" data-testid="generation-warnings">
              <div 
                v-for="(warning, index) in generationResults.warnings" 
                :key="index"
                class="warning-item"
              >
                {{ warning }}
              </div>
            </div>
          </div>

          <div class="schedule-preview" data-testid="schedule-preview">
            <h4>Schedule Preview</h4>
            <WeeklySchedule 
              v-if="selectedSchedule"
              :schedule="selectedSchedule"
              :readonly="true"
            />
          </div>
        </div>

        <div class="step-actions">
          <button 
            type="button" 
            class="btn-secondary" 
            @click="startOver"
            data-testid="start-over"
          >
            Start Over
          </button>
          <button 
            v-if="generationResults?.success" 
            type="button" 
            class="btn-primary" 
            @click="saveSchedule"
            data-testid="save-schedule"
          >
            Save Schedule
          </button>
        </div>
      </div>
    </div>

    <!-- Add Course Modal -->
    <CourseModal
      v-if="showAddCourseModal"
      :course="editingCourse"
      @save="saveCourse"
      @cancel="closeModal"
      data-testid="course-modal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useScheduleStore } from '~/stores/schedule'
import { useTeachersStore } from '~/stores/teachers'
import { useGroupsStore } from '~/stores/groups'
import { useRuleStore } from '~/stores/rules'
import WeeklySchedule from '~/components/schedule/WeeklySchedule.vue'
import CourseModal from '~/components/modals/CourseModal.vue'

// Type definitions
interface Course {
  id: string
  name: string
  teacherId: string
  groupIds: string[]
  weeklyHours: number
  subjectId?: string
}

interface GenerationStatus {
  phase: string
  description: string
  iterations: number
  bestScore: number | null
  elapsedTime: number
}

interface LogEntry {
  timestamp: string
  message: string
  type: 'info' | 'warning' | 'error'
}

interface ScheduleAlternative {
  id: string
  score: number | null
  lessons: any[]
}

interface GenerationResults {
  success: boolean
  error?: string
  totalTime: number
  iterations: number
  finalScore?: number | null
  warnings: string[]
  alternatives: ScheduleAlternative[]
}

interface ScheduleData {
  name: string
  academicYear: string
  semester: string
  description: string
  courses: Course[]
  constraints: {
    workingHours: {
      start: string
      end: string
    }
    lessonDuration: number
    breakDuration: number
    maxLessonsPerDay: number
    maxSameSubjectPerDay: number
  }
  generationOptions: {
    algorithm: string
    useRandomization: boolean
    generateAlternatives: boolean
    maxAlternatives: number
    maxIterations: number
    timeLimit: number
  }
  activeRuleIds: string[]
}

// Store instances
const scheduleStore = useScheduleStore()
const teacherStore = useTeachersStore()
const groupStore = useGroupsStore()
const ruleStore = useRuleStore()

// Workflow state
const currentStep = ref(0)
const isGenerating = ref(false)
const showAddCourseModal = ref(false)
const editingCourse = ref<Course | null>(null)
const selectedAlternative = ref(0)

// Workflow steps definition
const workflowSteps = [
  { id: 'basic', title: 'Basic Info' },
  { id: 'courses', title: 'Courses' },
  { id: 'constraints', title: 'Constraints' },
  { id: 'generation', title: 'Generation' },
  { id: 'review', title: 'Review' },
  { id: 'progress', title: 'Progress' },
  { id: 'results', title: 'Results' }
]

// Schedule data
const scheduleData = ref<ScheduleData>({
  name: '',
  academicYear: '',
  semester: '',
  description: '',
  courses: [],
  constraints: {
    workingHours: {
      start: '08:15',
      end: '16:00'
    },
    lessonDuration: 45,
    breakDuration: 15,
    maxLessonsPerDay: 8,
    maxSameSubjectPerDay: 2
  },
  generationOptions: {
    algorithm: 'greedy',
    useRandomization: true,
    generateAlternatives: false,
    maxAlternatives: 3,
    maxIterations: 1000,
    timeLimit: 30
  },
  activeRuleIds: []
})

// Generation state
const generationProgress = ref(0)
const generationStatus = ref<GenerationStatus>({
  phase: 'Initializing',
  description: 'Setting up generation parameters...',
  iterations: 0,
  bestScore: null,
  elapsedTime: 0
})
const generationLog = ref<LogEntry[]>([])
const generationResults = ref<GenerationResults | null>(null)

// Computed properties
const availableYears = computed(() => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => currentYear + i)
})

const activeRules = computed(() => ruleStore.rules.filter(rule => rule.enabled))

const selectedSchedule = computed(() => {
  if (!generationResults.value?.alternatives) return null
  const alternative = generationResults.value.alternatives[selectedAlternative.value]
  if (!alternative) return null
  
  // Convert ScheduleAlternative to Schedule format expected by WeeklySchedule component
  return {
    id: alternative.id,
    name: scheduleData.value.name || 'Generated Schedule',
    weekNumber: Math.ceil(new Date().getDate() / 7),
    year: new Date().getFullYear(),
    status: 'draft' as const,
    lessons: alternative.lessons
  }
})

// Methods
const nextStep = () => {
  if (currentStep.value < workflowSteps.length - 1) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const getTeacherName = (teacherId: string) => {
  const teacher = teacherStore.teachers.find(t => t.id === teacherId)
  return teacher?.name || 'Unknown'
}

const getGroupNames = (groupIds: string[]) => {
  return groupIds.map(id => {
    const group = groupStore.groups.find(g => g.id === id)
    return group?.name || 'Unknown'
  })
}

const saveCourse = (courseData: Partial<Course>) => {
  if (editingCourse.value) {
    // Update existing course
    const index = scheduleData.value.courses.findIndex(c => c.id === editingCourse.value!.id)
    if (index !== -1) {
      scheduleData.value.courses[index] = { ...editingCourse.value, ...courseData }
    }
  } else {
    // Add new course
    const newCourse: Course = {
      id: Date.now().toString(),
      name: courseData.name || '',
      teacherId: courseData.teacherId || '',
      groupIds: courseData.groupIds || [],
      weeklyHours: courseData.weeklyHours || 0,
      subjectId: courseData.subjectId
    }
    scheduleData.value.courses.push(newCourse)
  }
  closeModal()
}

const editCourse = (course: any) => {
  editingCourse.value = course
  showAddCourseModal.value = true
}

const removeCourse = (courseId: string) => {
  scheduleData.value.courses = scheduleData.value.courses.filter(c => c.id !== courseId)
}

const closeModal = () => {
  showAddCourseModal.value = false
  editingCourse.value = null
}

const generateSchedule = async () => {
  currentStep.value = 5 // Move to progress step
  isGenerating.value = true
  generationProgress.value = 0
  generationLog.value = []
  
  try {
    // Simulate generation process
    await simulateGeneration()
    
    // Move to results step
    currentStep.value = 6
  } catch (error) {
    console.error('Generation failed:', error)
    generationResults.value = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      totalTime: generationStatus.value.elapsedTime,
      iterations: generationStatus.value.iterations,
      warnings: [],
      alternatives: []
    }
    currentStep.value = 6
  } finally {
    isGenerating.value = false
  }
}

const simulateGeneration = async () => {
  const startTime = Date.now()
  const phases: string[] = [
    'Initializing parameters',
    'Loading course data',
    'Applying constraints',
    'Running optimization',
    'Generating alternatives',
    'Finalizing results'
  ]
  
  for (let i = 0; i < phases.length; i++) {
    generationStatus.value.phase = phases[i]!
    generationStatus.value.description = `Processing ${phases[i]!.toLowerCase()}...`
    
    // Add log entry
    generationLog.value.push({
      timestamp: new Date().toLocaleTimeString(),
      message: phases[i]!,
      type: 'info'
    })
    
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Update progress
    generationProgress.value = ((i + 1) / phases.length) * 100
    generationStatus.value.iterations += Math.floor(Math.random() * 50) + 10
    generationStatus.value.bestScore = Math.random() * 100
    generationStatus.value.elapsedTime = Math.floor((Date.now() - startTime) / 1000)
  }
  
  // Generate mock results
  generationResults.value = {
    success: true,
    totalTime: generationStatus.value.elapsedTime,
    iterations: generationStatus.value.iterations,
    finalScore: generationStatus.value.bestScore,
    warnings: [
      'Some courses may have suboptimal time slots',
      'Teacher workload is not perfectly balanced'
    ],
    alternatives: [
      {
        id: 'alt-1',
        score: generationStatus.value.bestScore,
        lessons: []
      }
    ]
  }
}

const cancelGeneration = () => {
  isGenerating.value = false
  currentStep.value = 4 // Go back to review step
}

const startOver = () => {
  currentStep.value = 0
  generationResults.value = null
  generationProgress.value = 0
  selectedAlternative.value = 0
}

const saveSchedule = async () => {
  try {
    await scheduleStore.saveSchedule({
      name: scheduleData.value.name,
      lessons: selectedSchedule.value?.lessons || [],
      status: 'draft'
    })
    
    // Navigate to schedules page or show success message
    navigateTo('/schedules')
  } catch (error) {
    console.error('Failed to save schedule:', error)
  }
}

// Initialize data on mount
onMounted(async () => {
  await Promise.all([
    teacherStore.loadTeachers(),
    groupStore.loadGroups(),
    ruleStore.loadRules()
  ])
})
</script>

<style scoped>
.schedule-generation-workflow {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.workflow-header {
  margin-bottom: 2rem;
}

.workflow-title {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.progress-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
}

.progress-step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 20px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #e5e7eb;
  z-index: -1;
}

.progress-step.completed:not(:last-child)::after {
  background: #10b981;
}

.step-indicator {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.progress-step.active .step-indicator {
  background: #3b82f6;
  color: white;
}

.progress-step.completed .step-indicator {
  background: #10b981;
  color: white;
}

.step-label {
  font-size: 0.875rem;
  text-align: center;
}

.progress-bar {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #10b981;
  transition: width 0.3s ease;
}

.workflow-step {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.step-form {
  max-width: 600px;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

input, select, textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 1rem;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.courses-list {
  display: grid;
  gap: 1rem;
}

.course-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
}

.course-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  padding: 0.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1.2rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.generation-progress {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.progress-circle {
  width: 120px;
  height: 120px;
}

.circular-chart {
  display: block;
  margin: 10px auto;
  max-width: 80%;
  max-height: 250px;
}

.circle-bg {
  fill: none;
  stroke: #efefef;
  stroke-width: 3.8;
}

.circle {
  fill: none;
  stroke-width: 2.8;
  stroke-linecap: round;
  animation: progress 1s ease-out forwards;
  stroke: #3b82f6;
}

.percentage {
  fill: #666;
  font-family: sans-serif;
  font-size: 0.5em;
  text-anchor: middle;
}

.results-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.summary-card {
  padding: 1.5rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

.alternatives-list {
  display: grid;
  gap: 0.5rem;
}

.alternative-item {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
}

.alternative-item.active {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.review-list {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
}

.review-list dt {
  font-weight: 500;
}

.success {
  color: #10b981;
}

.error {
  color: #ef4444;
}

@media (max-width: 768px) {
  .progress-steps {
    flex-direction: column;
    gap: 1rem;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .generation-progress,
  .results-summary {
    grid-template-columns: 1fr;
  }
}
</style>