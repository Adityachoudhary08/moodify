import React from 'react'
import '../style/register.scss'
import FormGroup from '../components/FormGroup'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

const Register = () => {

  const { loading, handleRegister } = useAuth()
  const navigate = useNavigate()

  const [username, setusername] = useState('')
  const [email, setemail] = useState('')
  const [password, setpassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMessage('')
    try {
      await handleRegister({ username, email, password })
      navigate('/')
    } catch (error) {
      setErrorMessage(error.message || 'Registration failed')
    }
  }

  return (
    <main className='register-page'>
      <div className="form-container">
        <p className="eyebrow">MOODIFY</p>
        <h1>Create your account</h1>
        <p className="form-intro">Save your moods and find the music that fits them.</p>
        <form onSubmit={handleSubmit}>
          <FormGroup
            value={username}
            onChange={(e) => setusername(e.target.value)}
            label="Username" placeholder="Choose a username" autoComplete="username" />
          <FormGroup
            value={email}
            onChange={(e) => setemail(e.target.value)}
            label="Email" placeholder="you@example.com" type="email" autoComplete="email" />
          <FormGroup
            value={password}
            onChange={(e) => setpassword(e.target.value)}
            label="Password" placeholder="At least 8 characters" type="password" autoComplete="new-password" />
          {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
          <button className='button' type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="form-footer">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </main>
  )
}

export default Register