// import React from 'react'
// import { useAuth } from '../hooks/useAuth'
// import { useNavigate } from 'react-router-dom'

// const Protected = ({ children }) => {
//   const { user, loading } = useAuth();
//   const navigate = useNavigate();


//   if(loading) {
//     return <div>Loading...</div>
//   } 


//   if (!loading|| !user) {
//    return <navigate to="/login" />
//   }
//   return children
 
// }

// export default Protected

import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user && !loading) {
    return <Navigate to="/login" />
  }

  return children
}

export default Protected