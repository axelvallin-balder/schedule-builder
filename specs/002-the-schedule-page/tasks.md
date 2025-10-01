# Tasks: Calendar Schedule Display

**Input**: Design documents from `/specs/002-the-schedule-page/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: TypeScript 5.2, Node.js 20.x, Nuxt.js 3.x, Vue.js 3.x, Pinia
   → Structure: Frontend extension to existing full-stack Nuxt.js app
2. Load design documents:
   → data-model.md: CalendarTimeSlot, CalendarLesson, CalendarWeek, CalendarDay view models
   → contracts/api.md: 6 existing API endpoints for data loading
   → quickstart.md: Component structure and user workflow scenarios
3. Generate tasks by category:
   → Setup: TypeScript types, component structure, store setup
   → Tests: API integration tests, component tests, E2E tests
   → Core: View models, services, components, pages
   → Integration: Store integration, API service integration
   → Polish: Unit tests, performance validation, accessibility
4. Apply task rules:
   → Different files = mark [P] for parallel execution
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate: All view models have creation tasks, all components have tests
9. Return: SUCCESS (28 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Frontend**: `frontend/app/` (Nuxt.js 3 structure)
- **Components**: `frontend/app/components/schedule/`
- **Stores**: `frontend/app/stores/`
- **Services**: `frontend/services/`
- **Tests**: `frontend/tests/`

## Phase 3.1: Setup
- [x] T001 Create TypeScript interfaces for calendar view models in `frontend/types/calendar.ts`
- [x] T002 [P] Initialize calendar store structure in `frontend/app/stores/calendar.ts`
- [x] T003 [P] Set up calendar service skeleton in `frontend/services/calendarService.ts`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### API Integration Tests
- [x] T004 [P] Contract test GET /api/schedules in `frontend/tests/integration/api/schedules.test.ts`
- [x] T005 [P] Contract test GET /api/schedules/:id in `frontend/tests/integration/api/schedule-detail.test.ts`
- [x] T006 [P] Contract test GET /api/classes in `frontend/tests/integration/api/classes.test.ts`
- [x] T007 [P] Contract test GET /api/groups in `frontend/tests/integration/api/groups.test.ts`

### Component Tests
- [x] T008 [P] Component test ScheduleSelector dropdown in `frontend/tests/components/schedule/ScheduleSelector.test.ts`
- [x] T009 [P] Component test ClassSelector dropdown in `frontend/tests/components/schedule/ClassSelector.test.ts`
- [x] T010 [P] Component test CalendarView grid layout in `frontend/tests/components/schedule/CalendarView.test.ts`
- [x] T011 [P] Component test CalendarNavigation responsive toggle in `frontend/tests/components/schedule/CalendarNavigation.test.ts`

### Service Tests
- [x] T012 [P] Service test calendar data transformation in `frontend/tests/services/calendarService.test.ts`
- [x] T013 [P] Store test calendar state management in `frontend/tests/stores/calendar.test.ts`

### E2E Tests
- [x] T014 [P] E2E test schedule selection workflow in `frontend/tests/e2e/schedule-selection.spec.ts`
- [x] T015 [P] E2E test calendar display and navigation in `frontend/tests/e2e/calendar-display.spec.ts`

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### View Models and Services
- [x] T016 [P] CalendarTimeSlot interface implementation in `frontend/types/calendar.ts`
- [x] T017 [P] CalendarLesson interface implementation in `frontend/types/calendar.ts`
- [x] T018 [P] CalendarWeek interface implementation in `frontend/types/calendar.ts`
- [x] T019 Calendar data transformation service in `frontend/services/calendarService.ts`

### Pinia Stores
- [x] T020 Calendar store state and actions in `frontend/app/stores/calendar.ts`
- [ ] T021 Enhanced schedule store for calendar integration in `frontend/app/stores/schedule.ts`

### Vue Components
- [ ] T022 [P] ScheduleSelector dropdown component in `frontend/app/components/schedule/ScheduleSelector.vue`
- [ ] T023 [P] ClassSelector dropdown component in `frontend/app/components/schedule/ClassSelector.vue`
- [ ] T024 [P] CalendarNavigation responsive toggle in `frontend/app/components/schedule/CalendarNavigation.vue`
- [ ] T025 CalendarView main grid component in `frontend/app/components/schedule/CalendarView.vue`
- [ ] T026 Enhanced LessonCard for calendar display in `frontend/app/components/schedule/LessonCard.vue`

### Pages
- [ ] T027 Schedule page with calendar integration in `frontend/app/pages/schedules/index.vue`

## Phase 3.4: Integration
- [ ] T028 Connect CalendarView to calendar store in `frontend/app/components/schedule/CalendarView.vue`

## Phase 3.5: Polish
- [ ] T029 [P] Unit tests for time slot calculations in `frontend/tests/unit/timeSlotUtils.test.ts`
- [ ] T030 [P] Performance tests for calendar rendering in `frontend/tests/performance/calendar-performance.test.ts`
- [ ] T031 [P] Accessibility tests for calendar navigation in `frontend/tests/accessibility/calendar-a11y.test.ts`
- [ ] T032 [P] Update component documentation in `docs/components/calendar.md`

## Dependencies
- Tests (T004-T015) before implementation (T016-T028)
- TypeScript interfaces (T001, T016-T018) before services (T019, T020)
- Services (T019, T020) before components (T022-T026)
- Components before pages (T027)
- Store integration (T021, T028) after individual components
- Implementation before polish (T029-T032)

## Parallel Example
```bash
# Launch API contract tests together (T004-T007):
Task: "Contract test GET /api/schedules in frontend/tests/integration/api/schedules.test.ts"
Task: "Contract test GET /api/schedules/:id in frontend/tests/integration/api/schedule-detail.test.ts"
Task: "Contract test GET /api/classes in frontend/tests/integration/api/classes.test.ts"
Task: "Contract test GET /api/groups in frontend/tests/integration/api/groups.test.ts"

# Launch component tests together (T008-T011):
Task: "Component test ScheduleSelector dropdown in frontend/tests/components/schedule/ScheduleSelector.test.ts"
Task: "Component test ClassSelector dropdown in frontend/tests/components/schedule/ClassSelector.test.ts"
Task: "Component test CalendarView grid layout in frontend/tests/components/schedule/CalendarView.test.ts"
Task: "Component test CalendarNavigation responsive toggle in frontend/tests/components/schedule/CalendarNavigation.test.ts"

# Launch view model implementations together (T016-T018):
Task: "CalendarTimeSlot interface implementation in frontend/types/calendar.ts"
Task: "CalendarLesson interface implementation in frontend/types/calendar.ts"
Task: "CalendarWeek interface implementation in frontend/types/calendar.ts"

# Launch component implementations together (T022-T024):
Task: "ScheduleSelector dropdown component in frontend/app/components/schedule/ScheduleSelector.vue"
Task: "ClassSelector dropdown component in frontend/app/components/schedule/ClassSelector.vue"
Task: "CalendarNavigation responsive toggle in frontend/app/components/schedule/CalendarNavigation.vue"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Commit after each task
- CalendarView (T025) depends on all other components being complete
- Enhanced LessonCard (T026) extends existing component
- Schedule page (T027) orchestrates all components

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - 6 API endpoints → 4 contract test tasks (T004-T007)
   - Data loading patterns → service integration tests
   
2. **From Data Model**:
   - CalendarTimeSlot, CalendarLesson, CalendarWeek, CalendarDay → view model tasks (T016-T018)
   - State management → store tasks (T020-T021)
   
3. **From Quickstart User Stories**:
   - Schedule selection → E2E test (T014)
   - Calendar display → E2E test (T015)
   - Component interactions → component tests (T008-T011)

4. **Ordering**:
   - Setup (T001-T003) → Tests (T004-T015) → Models (T016-T018) → Services (T019-T021) → Components (T022-T026) → Pages (T027) → Integration (T028) → Polish (T029-T032)

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All view models have creation tasks (T016-T018)
- [x] All API endpoints have contract tests (T004-T007)
- [x] All components have individual tests (T008-T011, T013)
- [x] All tests come before implementation (T004-T015 before T016-T028)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD workflow enforced (tests must fail before implementation)
- [x] Calendar-specific requirements covered (responsive, time slots, lesson positioning)
- [x] Integration with existing stores and components planned (enhanced LessonCard, schedule store)