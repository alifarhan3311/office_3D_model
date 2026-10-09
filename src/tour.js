export const VISITOR_PATH = [
  [-26.3, 0.12, 8.65],
  [-26.1, 0.12, 7.25],
  [-22.5, 0.12, 6.2],
  [-22.5, 0.12, 3.65],
  [-22.65, 0.12, 2.25],
]
export const VISITOR_SPEED = 1.05
export const PATH_LENGTH = VISITOR_PATH.slice(1).reduce((total, point, index) => total + Math.hypot(point[0]-VISITOR_PATH[index][0],point[2]-VISITOR_PATH[index][2]), 0)
export function sampleVisitorPath(distance) {
  let remaining = Math.max(0, distance)
  for (let i=1;i<VISITOR_PATH.length;i++) {
    const a=VISITOR_PATH[i-1], b=VISITOR_PATH[i]
    const length=Math.hypot(b[0]-a[0],b[2]-a[2])
    if (remaining<=length || i===VISITOR_PATH.length-1) {
      const t=Math.min(remaining/length,1)
      return {position:a.map((value,axis)=>value+(b[axis]-value)*t),heading:Math.atan2(b[0]-a[0],b[2]-a[2])}
    }
    remaining-=length
  }
}
export const RECEPTIONIST_POSITION = [-25.5, 0.12, 0.1]
export const TOUR_QUESTIONS = [
  { id: 'purpose', text: 'Welcome! Aap kis liye aaye hain?', options: ['Meeting', 'Interview', 'Office tour'] },
  { id: 'department', text: 'Aap kis department se milna chahte hain?', options: ['HR', 'Management', 'Engineering'] },
  { id: 'appointment', text: 'Kya aapki appointment booked hai?', options: ['Haan, booked hai', 'Nahi, walk-in hoon'] },
]
export function receptionResponse(answers) {
  if (answers.purpose === 'Office tour') return 'Welcome! Aap office explore kar sakte hain. Camera controls se rooms dekhiye.'
  if (answers.appointment === 'Haan, booked hai') return `${answers.department} ke saath aapki ${answers.purpose.toLowerCase()} request note kar li hai. Reception par wait kijiye.`
  return `${answers.department} ke liye aapki walk-in request note kar li hai. Appointment arrange karne ke liye reception par wait kijiye.`
}
