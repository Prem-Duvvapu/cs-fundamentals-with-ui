import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <section className="roadmap-empty-state app-error-page" role="alert">
        <p className="eyebrow">Something went wrong</p>
        <h1>This page couldn't be displayed</h1>
        <p>A page resource may have failed to load. Reload the page, or return to the curriculum.</p>
        <div className="not-found-actions">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reload page</button>
          <a className="btn btn-secondary" href="/">Browse all topics</a>
        </div>
      </section>
    )
  }
}
