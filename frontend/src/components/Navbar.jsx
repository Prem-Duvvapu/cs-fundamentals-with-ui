import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="logo">CS Fundamentals</Link>
      <ul className="nav-links">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/topic/process-management">OS</Link></li>
      </ul>
    </nav>
  )
}
