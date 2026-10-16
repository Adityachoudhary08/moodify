import React from 'react'
import { useState } from 'react'
import '../style/login.scss'
import '../style/button.scss'
import FormGroup from '../components/FormGroup'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'


const Login = () => {

  const { loading, handleLogin } = useAuth()
  const navigate = useNavigate()
       



  const [email, setemail] = useState('')
  const [password, setpassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMessage('')
    try {
      await handleLogin({ email, password })
      navigate('/')
    } catch (error) {
      setErrorMessage(error.message || 'Login failed')
    }
  }


  return (
    <main className='login-page'>
      <div className="form-container">
        <p className="eyebrow">MOODIFY</p>
        <h1>Welcome back</h1>
        <p className="form-intro">Pick up where your mood and music left off.</p>
        <form onSubmit={handleSubmit}>
          <FormGroup
            value={email}
            onChange={(e) => setemail(e.target.value)}
            label="Email"
            placeholder="Enter your email" />
          <FormGroup
            value={password}
            onChange={(e) => setpassword(e.target.value)}
            label="Password"
            placeholder="Enter your password"
            type="password"
            autoComplete="current-password" />
          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
          <button className='button' type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="form-footer">Don't have an account? <Link to="/register">Create one</Link></p>
      </div>
    </main>
  )
}

export default Login