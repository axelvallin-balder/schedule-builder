<template>
  <div class="modal-overlay" @click="$emit('cancel')" data-testid="course-modal-overlay">
    <div class="modal-content" @click.stop data-testid="course-modal">
      <div class="modal-header">
        <h3>{{ course ? 'Edit Course' : 'Add New Course' }}</h3>
        <button class="btn-icon" @click="$emit('cancel')" data-testid="close-modal">×</button>
      </div>
      
      <div class="modal-body">
        <form @submit.prevent="saveCourse">
          <div class="form-group">
            <label for="course-name">Course Name *</label>
            <input
              id="course-name"
              v-model="courseData.name"
              type="text"
              required
              data-testid="course-name"
              placeholder="Enter course name"
            />
          </div>
          
          <div class="form-group">
            <label for="course-subject">Subject *</label>
            <select
              id="course-subject"
              v-model="courseData.subject"
              required
              data-testid="course-subject"
            >
              <option value="">Select subject</option>
              <option v-for="subject in availableSubjects" :key="subject" :value="subject">
                {{ subject }}
              </option>
            </select>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="course-teacher">Teacher *</label>
              <select
                id="course-teacher"
                v-model="courseData.teacherId"
                required
                data-testid="course-teacher"
              >
                <option value="">Select teacher</option>
                <option v-for="teacher in teachers" :key="teacher.id" :value="teacher.id">
                  {{ teacher.name }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="weekly-hours">Weekly Hours *</label>
              <input
                id="weekly-hours"
                v-model.number="courseData.weeklyHours"
                type="number"
                min="1"
                max="20"
                required
                data-testid="weekly-hours"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label>Groups *</label>
            <div class="groups-selection" data-testid="groups-selection">
              <label 
                v-for="group in groups" 
                :key="group.id"
                class="checkbox-label"
              >
                <input
                  type="checkbox"
                  :value="group.id"
                  v-model="courseData.groupIds"
                  data-testid="group-checkbox"
                />
                <span>{{ group.name }} ({{ group.studentCount }} students)</span>
              </label>
            </div>
          </div>
          
          <div class="form-group">
            <label for="course-description">Description</label>
            <textarea
              id="course-description"
              v-model="courseData.description"
              data-testid="course-description"
              placeholder="Optional course description"
              rows="3"
            ></textarea>
          </div>
        </form>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn-secondary" @click="$emit('cancel')" data-testid="cancel-course">
          Cancel
        </button>
        <button 
          type="button" 
          class="btn-primary" 
          @click="saveCourse"
          :disabled="!isValid"
          data-testid="save-course"
        >
          {{ course ? 'Update' : 'Add' }} Course
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTeachersStore } from '~/stores/teachers'
import { useGroupsStore } from '~/stores/groups'

// Props and emits
const props = defineProps<{
  course?: any
}>()

const emit = defineEmits<{
  save: [courseData: any]
  cancel: []
}>()

// Store instances
const teacherStore = useTeachersStore()
const groupStore = useGroupsStore()

// Form data
const courseData = ref({
  name: '',
  subject: '',
  teacherId: '',
  weeklyHours: 1,
  groupIds: [],
  description: ''
})

// Available subjects
const availableSubjects = [
  'Mathematics',
  'Science',
  'English',
  'History',
  'Geography',
  'Art',
  'Music',
  'Physical Education',
  'Computer Science',
  'Foreign Language'
]

// Computed properties
const teachers = computed(() => teacherStore.teachers)
const groups = computed(() => groupStore.groups)

const isValid = computed(() => {
  return courseData.value.name &&
         courseData.value.subject &&
         courseData.value.teacherId &&
         courseData.value.weeklyHours > 0 &&
         courseData.value.groupIds.length > 0
})

// Methods
const saveCourse = () => {
  if (isValid.value) {
    emit('save', { ...courseData.value })
  }
}

// Watch for props changes
watch(() => props.course, (newCourse) => {
  if (newCourse) {
    courseData.value = { ...newCourse }
  } else {
    courseData.value = {
      name: '',
      subject: '',
      teacherId: '',
      weeklyHours: 1,
      groupIds: [],
      description: ''
    }
  }
}, { immediate: true })
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
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

.groups-selection {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 150px;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #f9fafb;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
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

.btn-icon {
  padding: 0.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1.2rem;
  border-radius: 4px;
}

.btn-icon:hover {
  background: #f3f4f6;
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>