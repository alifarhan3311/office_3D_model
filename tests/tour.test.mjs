import test from 'node:test'
import assert from 'node:assert/strict'
import { TOUR_QUESTIONS, receptionResponse, VISITOR_PATH } from '../src/tour.js'

test('reception branches distinguish appointments, walk-ins and tours',()=>{
  assert.match(receptionResponse({purpose:'Meeting',department:'HR',appointment:'Yes, I have an appointment'}),/HR.*meeting/)
  assert.match(receptionResponse({purpose:'Interview',department:'Engineering',appointment:'No, I am a walk-in visitor'}),/Engineering.*walk-in/)
  assert.match(receptionResponse({purpose:'Office tour'}),/explore the office/)
  assert.equal(TOUR_QUESTIONS.length,3)
  assert.equal(VISITOR_PATH[0][2],8.65)
  assert.equal(VISITOR_PATH.at(-1)[2],2.25)
})

