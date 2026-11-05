# AI checking for teacher-assigned quizzes

Teacher-assigned quizzes use a private review workflow:

1. For MCQs, the existing correct option is the marking key. For written questions, the teacher enters a reference answer and may add marking criteria when creating the quiz. These fields are available to teachers only.
2. A submission is queued for checking. The worker checks MCQs against their keys and asks the configured Groq model to suggest partial credit for written answers, bounded by each question's marks. Blank answers receive zero. Feedback explains deductions.
3. At the deadline, saved drafts are submitted and queued automatically. Students who have not attempted a quiz receive a blank attempt for teacher review.
4. Teachers open **My Courses → course → quiz review** to inspect a student's answers and AI suggestions. They can retry failed checks, adjust marks and feedback, and save a private draft.
5. **Approve & publish** stores the teacher's final marks and feedback. Only then are the grade and feedback included in student-facing quiz and grade responses. Automatic AI marks and teacher drafts remain private.

The worker runs inside the server process after MongoDB connects. Written-answer suggestions require `GROQ_API_KEY`; MCQ checking is local. If an AI check fails, the attempt remains unpublished and the teacher can retry it from the review screen.
