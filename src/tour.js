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
export const RECEPTIONIST_POSITION = [-24.530819192528725, 0, 0.3404424447130704]
export const TOUR_QUESTIONS = [
  { id: 'purpose', text: 'Welcome! What brings you here today?', options: ['Meeting', 'Interview', 'Office tour'] },
  { id: 'department', text: 'Which department would you like to visit?', options: ['HR', 'Management', 'Engineering'] },
  { id: 'appointment', text: 'Do you have an appointment?', options: ['Yes, I have an appointment', 'No, I am a walk-in visitor'] },
]
export function receptionResponse(answers) {
  if (answers.purpose === 'Office tour') return 'Welcome! You can explore the office using the camera controls.'
  if (answers.appointment === 'Yes, I have an appointment') return `Your ${answers.department} ${answers.purpose.toLowerCase()} request has been noted. Please wait at reception.`
  return `Your ${answers.department} walk-in request has been noted. Please wait at reception to arrange an appointment.`
}
