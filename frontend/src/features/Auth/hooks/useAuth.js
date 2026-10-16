import { login,register,getme,logout } from "../services/auth.api";
import { useContext, useEffect } from "react";
import { AuthContext } from "../auth.context";  

export const useAuth = () => {
    const context = useContext(AuthContext)
    const { user, setuser, loading, setloading } = context 

    async function handleLogin({email, username, password}) {
        setloading(true)
        try {
            const data = await login({email, username, password})
            setuser(data.user)
        } catch (error) {
            throw error
        } finally {
            setloading(false)
        }
    }


    async function handleRegister({username, email, password}) {
        setloading(true)
        try{
            const data = await register({username, email, password})
            setuser(data.user)
        }catch(error) {
            throw error
        } finally {
            setloading(false)
        }   
    }

    async function handlegetme() {
        setloading(true)
        try {
            const data = await getme()
            setuser(data.user)
        } catch (error) {
            throw error
        } finally {
            setloading(false)
        }
    }

    async function handleLogout() {
        setloading(true)
        try {
            await logout()
            setuser(null)
        } catch (error) {
            throw error
        } finally {
            setloading(false)
        }   
    }

    useEffect(() => {
        const token = document.cookie.split('; ').find(row => row.startsWith('token='));
        if (token) {
            handlegetme();
        } else {
            setloading(false);
        }
    }, [])  

    return( {user, loading, handleLogin, handleRegister, handlegetme, handleLogout} )

}

