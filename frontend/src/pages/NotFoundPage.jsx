import { Link } from 'react-router-dom'

export default function NotFoundPage({ title = 'Page not found', message = 'The page you requested does not exist or may have moved.' }) {
  return (
    <section className="roadmap-empty-state not-found-page" role="status">
      <p className="eyebrow">404 · Lost in the curriculum?</p>
      <h1>{title}</h1>
      <p>{message}</p>
      <div className="not-found-actions">
        <Link className="btn btn-primary" to="/">Browse all topics</Link>
        <Link className="btn btn-secondary" to="/search">Search the curriculum</Link>
      </div>
    </section>
  )
}
