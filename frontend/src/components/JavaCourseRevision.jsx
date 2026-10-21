import { Link } from 'react-router-dom'
import LessonRow from './shared/LessonRow'
import Icon from './shared/Icon'
import { readingUrl } from '../utils/learningState'

const entries = [
  {
    id: 'java-oop-pillars',
    familiarName: 'OOP pillars',
    clarification: 'Encapsulation protects valid state through well-defined operations. Adding unrestricted setters can still break an object’s rules.',
    source: 'https://drive.google.com/file/d/1eg_I2kdII2_KPtzGifky-YEvFcgaCX4H/view',
    sections: [
      ['2-run-your-first-account-class', 'Run an account class'],
      ['the-four-oop-pillars', 'Revisit the four pillars'],
      ['compile-time-polymorphism-overloading-vs-runtime-polymorphism-overriding', 'Compare overloading and overriding']
    ]
  },
  {
    id: 'java-execution-pipeline',
    familiarName: 'JDK, JRE and JVM',
    clarification: 'The JDK, runtime and JVM form a conceptual nesting model. Running bytecode still requires a compatible runtime and the application’s dependencies.',
    source: 'https://drive.google.com/file/d/1orNECv5ucicgyhcC58tsQ10lTqj0Xc0K/view',
    sections: [
      ['jdk-jre-jvm-and-bytecode', 'Connect JDK, runtime and JVM'],
      ['source-becomes-platform-neutral-bytecode', 'Follow source to bytecode'],
      ['the-interpreter-starts-quickly-jit-optimizes-hot-code', 'Understand interpretation and JIT']
    ]
  }
]

export default function JavaCourseRevision({ topics, progress, learning, onToggleBookmark }) {
  const lessons = entries.map(entry => ({ ...entry, topic: topics.find(topic => topic.id === entry.id && topic.category === 'java-spring') }))
  if (lessons.some(entry => !entry.topic)) return null

  return <details className="course-revision">
    <summary>
      <span className="course-revision-label"><span>Revisit Java-by-Shrayansh</span><span className="course-revision-count">2 reviewed entries</span></span>
      <Icon name="chevronDown" size={18} />
    </summary>
    <div className="course-revision-body">
      <h2>Two familiar lessons</h2>
      <p className="path-intro">Use the first two entries in the course order you already know. They open the same lessons and share your bookmarks and progress. For a first pass, follow the main lesson order below.</p>
      <ol className="lesson-rows" aria-label="Java-by-Shrayansh revision order">
        {lessons.map((entry, index) => <LessonRow
          key={entry.id}
          topic={entry.topic}
          number={index + 1}
          description={`Course entry ${index + 1}: ${entry.familiarName}`}
          bookmarked={Boolean(progress[entry.id]?.bookmarked)}
          completed={Boolean(progress[entry.id]?.completed)}
          onToggleBookmark={onToggleBookmark}
        >
          <p className="course-revision-note"><strong>Keep this distinction:</strong> {entry.clarification}</p>
          <ul className="course-revision-links" aria-label={`${entry.familiarName} revision links`}>
            {learning.reading[entry.id]?.headingId && <li><Link to={readingUrl(entry.topic, learning)}>Continue reading: {entry.topic.title}</Link></li>}
            {entry.sections.map(([id, label]) => <li key={id}><Link to={`/topic/${entry.id}#${id}`}>{label}</Link></li>)}
            <li><Link to={`/topic/${entry.id}?view=practice`}>Practice: {entry.familiarName}</Link></li>
            <li><a href={entry.source}>Original notes: {entry.familiarName} (PDF)</a></li>
          </ul>
        </LessonRow>)}
      </ol>
      <p className="course-revision-note">The explanations and examples here are independently written, with corrections checked against Java 17. The linked notes are credited to the original course; the remaining course entries are still being reviewed.</p>
    </div>
  </details>
}
