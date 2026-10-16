/* eslint react-refresh/only-export-components: off */
import { createBrowserRouter } from 'react-router-dom'
import { createElement, lazy, Suspense } from 'react'

// Landing page - eager loaded (first impression matters)
import LandingPage from './features/Landing/LandingPage'

// Lazy-loaded route pages
const DiscoverPage = lazy(() => import('./features/Discover/DiscoverPage'))
const DetectPage = lazy(() => import('./features/Detect/DetectPage'))
const MoodPage = lazy(() => import('./features/Mood/MoodPage'))
const PlaylistPage = lazy(() => import('./features/Playlist/PlaylistPage'))
const Login = lazy(() => import('./features/Auth/pages/Login'))
const Register = lazy(() => import('./features/Auth/pages/Register'))

const PageLoader = () => (
  <div style={{
    minHeight: '100vh',
    background: 'var(--clr-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--clr-ink-muted)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.75rem',
    letterSpacing: '0.2em',
  }}>
    LOADING…
  </div>
)

const withSuspense = (RouteComponent) => (
  <Suspense fallback={<PageLoader />}>
    {createElement(RouteComponent)}
  </Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/discover',
    element: withSuspense(DiscoverPage),
  },
  {
    path: '/detect',
    element: withSuspense(DetectPage),
  },
  {
    path: '/mood',
    element: withSuspense(MoodPage),
  },
  {
    path: '/playlist',
    element: withSuspense(PlaylistPage),
  },
  {
    path: '/login',
    element: withSuspense(Login),
  },
  {
    path: '/register',
    element: withSuspense(Register),
  },
])

export default router
